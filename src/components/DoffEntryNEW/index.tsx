// FILE: src/components/DoffEntryNEW/index.tsx
// NEW ERP — Doff Entry (replaces legacy src/components/DoffEntry/index.tsx,
// identical copy components/DoffEntry/index.tsx; route app/(tabs)/doff-entry.tsx).
//
// Flow (same as legacy): criteria cascade Property → Year → Store → Merge → Item
// → Machine (each list auto-selects its first row; optional "Last Doff" machine
// filter) → Load data (proddoffshow) → machine/R.C. summary + totals →
// START doff (proddoffadd) / END doff (proddoffedit on the first doff without
// end date/time) → edit the first doff (dates, times, Chees, Gross Wt., Last
// Doff) and UPDATE (proddoffedit) or DELETE (proddoffdelete). Every write
// replaces the list with the response (data.main / data.mainnew).
//
// Endpoints (all `${API}/api/...`, Bearer token prop):
//   GET  get_criterion?prptype=<user_prptype>&txntype=''&fetch=prp   (property — legacy fetchAllPropertyData)
//   GET  getyear        { prpcode: '' }                               (year — legacy fetchAllYeardata(token, formData.PrpCode='' ))
//   GET  getstore       { prpcode, yearno:'', txntype:'mobile_doff_entry', prptype:<user_prptype> } + x-platform: mob
//   GET  get_criterion  { fetch:'mer',     txntype, prptype:'', prpcode, yearno, strcode, limit:'' }
//   GET  get_criterion  { fetch:'itm',     txntype, prptype:'', prpcode, yearno, strcode, mercode, limit:'' }
//   GET  get_criterion  { fetch:'machine', txntype, prptype:'', prpcode, yearno, strcode, mercode, itmcode, limit:'', islastdoff:'1'|'0' }
//   GET  proddoffshow   { txntype, prptype:'', prpcode, yearno, strcode, limit:'', maccode, mercode, itmcode, productionuid }
//   POST proddoffadd    merged(mainnew[0] ⊕ machine row) + startdate DD/MM/YYYY, starttime HH.mm, startdatetime ISO, shfcode '0', d1, d2, criteria
//   POST proddoffedit   END doff (enddate DD/MM/YYYY, endtime HH.mm) and card UPDATE (dates YYYYMMDD)
//   POST proddoffdelete { prpcode, yearno, strcode, mercode, itmcode, txntype, maccode, uid, productionuid }
// yearno = last 2 chars of the selected YearName. AsyncStorage read: 'user_prptype'.
import { AppAlert } from '@/common/utils/appAlert';
import { T, S } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Platform, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { Btn, Opt, SelectField, Sheet } from '../StockVerificationNEW/ui';
import {
  apiErrorText, fetchProperties, fetchStores, fetchYears, getCriterion, postDoff, prodDoffShow,
} from './api';
import DoffCard from './DoffCard';
import {
  applyFieldChange, buildAddPayload, buildDeletePayload, buildEndPayload, buildUpdatePayload, calculateSums, Crit,
  doffFlags, doffKey, Editable, fmt, formatDateDDMMYYYY, formatDateYYYYMMDD, formatTimeWithDot,
  getDisplayDate, getDisplayDateFromYYYYMMDD, initEditable, parseProductionDate, parseYYYYMMDD, pickerBounds, Row, str,
  TXNTYPE, validateDates, validateStartDateTime, validateUpdate,
} from './model';
import { DateTimeField, Kpi, KV } from './ui';

type Props = { token: string; API: string; username?: string };
type Busy = '' | 'load' | 'add' | 'end' | 'update' | 'delete';

/** Legacy passes formData.PrpCode to fetchAllYeardata; formData is never filled, so it is always ''. */
const LEGACY_YEAR_PRPCODE = '';
/** Legacy reads selectedYear.YearNo from a YearName string (undefined → fetchAllStoredata default ''). */
const LEGACY_STORE_YEARNO = '';

const showWarning = (m: string) => { AppAlert.alert('Warning', m); };
const showSuccess = (m: string) => { AppAlert.alert('Success', m); };
const showError = (m: string) => { AppAlert.alert('Error', m); };
const arr = (v: any): Row[] => (Array.isArray(v) ? v : []);

export default function DoffEntryNEW({ token, API }: Props) {
  const api = useMemo(() => ({ API, token }), [API, token]);
  const { width } = useWindowDimensions();
  const phone = width < 768;
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;
  const { minDate, maxDate } = useMemo(pickerBounds, []);

  /* ------------------------------ criteria ------------------------------ */
  const [properties, setProperties] = useState<Row[]>([]);
  const [propLoading, setPropLoading] = useState(false);
  const [propTick, setPropTick] = useState(0);
  const [selectedProperty, setSelectedProperty] = useState<Row | null>(null);
  const [years, setYears] = useState<Row[]>([]);
  const [yLoading, setYLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(''); // YearName (legacy)
  const [stores, setStores] = useState<Row[]>([]);
  const [sLoading, setSLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Row | null>(null);
  const [merList, setMerList] = useState<Row[]>([]);
  const [mLoading, setMLoading] = useState(false);
  const [selectedMer, setSelectedMer] = useState<Row | null>(null);
  const [itmList, setItmList] = useState<Row[]>([]);
  const [iLoading, setILoading] = useState(false);
  const [selectedItm, setSelectedItm] = useState<Row | null>(null);
  const [machines, setMachines] = useState<Row[]>([]);
  const [macLoading, setMacLoading] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Row | null>(null);
  const [filteredMachine, setFilteredMachine] = useState<Row[]>([]); // legacy getSelectedFilteredMachine
  const [isLastDoffFilter, setIsLastDoffFilter] = useState(false);
  const [propSelTick, setPropSelTick] = useState(0); // user picked a property → re-run store…machine
  const [merSelTick, setMerSelTick] = useState(0);   // user picked a merge → re-run item…machine
  const [critTick, setCritTick] = useState(0);        // manual refresh of mer/itm/machine lists

  /* -------------------------------- doffs -------------------------------- */
  const [doffs, setDoffs] = useState<Row[]>([]);      // data.main
  const [doffsNew, setDoffsNew] = useState<Row[]>([]); // data.mainnew
  const [editable, setEditable] = useState<Editable>({});
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<Busy>('');
  const [busyId, setBusyId] = useState<any>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');

  /* ---------------------------- start / end doff -------------------------- */
  const [expanded, setExpanded] = useState(false);
  const [expandedEnd, setExpandedEnd] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [startDateEnd, setStartDateEnd] = useState(new Date());
  const [startTimeEnd, setStartTimeEnd] = useState(new Date());

  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState<{ item: Row; validation: boolean } | null>(null);

  const prpCode = selectedProperty ? selectedProperty?.PrpCode : '';
  const yearnumber3 = selectedYear?.slice(-2) ? selectedYear.slice(-2) : '';
  const strCode = selectedStore ? selectedStore?.StrCode : '';
  const merCode = selectedMer ? selectedMer?.mercode : '';
  const itmCode = selectedItm ? selectedItm?.itmcode : '';
  const crit: Crit = { prpcode: prpCode, yearno: yearnumber3, strcode: strCode, mercode: merCode, itmcode: itmCode };

  /* ---- property (first one auto-selected on first load, like legacy) ---- */
  useEffect(() => {
    if (!token) return;
    let alive = true;
    setPropLoading(true);
    fetchProperties(api)
      .then((data) => {
        if (!alive) return;
        setProperties(data);
        if (data && data.length > 0) setSelectedProperty((prev) => (prev && propTick > 0 ? prev : data[0]));
      })
      .finally(() => alive && setPropLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, propTick]);

  /* ---- year: on property change, first YearName auto-selected ---- */
  useEffect(() => {
    if (!token) return;
    if (!selectedProperty || Object.keys(selectedProperty).length === 0) return;
    let alive = true;
    setYLoading(true);
    fetchYears(api, LEGACY_YEAR_PRPCODE)
      .then((data) => {
        if (!alive) return;
        setYears(data);
        if (data && data.length > 0) setSelectedYear(str(data[0].YearName));
      })
      .finally(() => alive && setYLoading(false));
    return () => { alive = false; };
  }, [api, selectedProperty, token]);

  /* ---- store: on property / year change, first store auto-selected ---- */
  useEffect(() => {
    if (!token) return;
    if (!selectedYear) return;
    let alive = true;
    setSLoading(true);
    fetchStores(api, prpCode, LEGACY_STORE_YEARNO, TXNTYPE)
      .then((data) => {
        if (!alive) return;
        setStores(data);
        if (data && data.length > 0) setSelectedStore(data[0]);
      })
      .finally(() => alive && setSLoading(false));
    return () => { alive = false; };
  }, [api, token, prpCode, selectedYear, propSelTick]);

  /* ---- merge (legacy getMergeData) ---- */
  useEffect(() => {
    if (!token || !prpCode) return;
    let alive = true;
    setMLoading(true);
    const payload = {
      fetch: 'mer', txntype: TXNTYPE, prptype: '', prpcode: prpCode, yearno: yearnumber3, strcode: strCode, limit: '',
    };
    getCriterion(api, payload)
      .then((body) => {
        if (!alive) return;
        if (body?.success && body?.response?.data?.length > 0) {
          setMerList(body.response.data);
          setSelectedMer(body.response.data[0]);
        } else console.log('merge API success false:', body);
      })
      .catch((e) => console.log('merge api error:', e))
      .finally(() => alive && setMLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, token, prpCode, selectedYear, strCode, propSelTick, critTick]);

  /* ---- item (legacy getItmData) ---- */
  useEffect(() => {
    if (!token || !prpCode) return;
    let alive = true;
    setILoading(true);
    const payload = {
      fetch: 'itm', txntype: TXNTYPE, prptype: '', prpcode: prpCode, yearno: yearnumber3, strcode: strCode, mercode: merCode, limit: '',
    };
    getCriterion(api, payload)
      .then((body) => {
        if (!alive) return;
        if (body?.success && body?.response?.data?.length > 0) {
          setItmList(body.response.data);
          setSelectedItm(body.response.data[0]);
        } else console.log('itm API success false:', body);
      })
      .catch((e) => console.log('itm api error:', e))
      .finally(() => alive && setILoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, token, prpCode, selectedYear, strCode, merCode, propSelTick, merSelTick, critTick]);

  /* ---- machine (legacy getMachineData, incl. Last Doff filter) ---- */
  useEffect(() => {
    if (!token || !prpCode) return;
    let alive = true;
    setMacLoading(true);
    const payload = {
      fetch: 'machine', txntype: TXNTYPE, prptype: '', prpcode: prpCode, yearno: yearnumber3, strcode: strCode,
      mercode: merCode, itmcode: itmCode, limit: '', islastdoff: isLastDoffFilter ? '1' : '0',
    };
    getCriterion(api, payload)
      .then((body) => {
        if (!alive) return;
        if (body?.success && body?.response?.data?.length > 0) {
          setMachines(body.response.data);
          setSelectedMachine(body.response.data[0]);
        } else console.log('machine API success false:', body);
      })
      .catch((e) => console.log('machine api error:', e))
      .finally(() => alive && setMacLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, token, prpCode, selectedYear, strCode, merCode, itmCode, isLastDoffFilter, propSelTick, merSelTick, critTick]);

  /* ---- selected machine rows (matched by MacName) — kept when selection is cleared, like legacy ---- */
  useEffect(() => {
    if (selectedMachine) {
      const names = [selectedMachine.MacName];
      setFilteredMachine(machines.filter((m) => names.includes(m.MacName)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMachine]);

  /* ---- editable copy of every doff, rebuilt whenever rows come back ---- */
  useEffect(() => {
    if (doffs.length > 0) setEditable(initEditable(doffs));
  }, [doffs]);

  const { hasLastDoff, isAnyEndEmpty, firstIncomplete } = useMemo(() => doffFlags(doffs), [doffs]);
  const sums = useMemo(() => calculateSums(doffs), [doffs]);
  const machine = filteredMachine[0];
  const proddate = machine?.proddate;
  const productionDate = parseProductionDate(proddate);

  /* ------------------------------ selections ----------------------------- */
  const selectProperty = (item: Row) => {
    setSelectedProperty(item);
    setSelectedStore(null);
    setSelectedMer(null);
    setSelectedItm(null);
    setSelectedMachine(null);
    setMerList([]);
    setItmList([]);
    setMachines([]);
    setPropSelTick((t) => t + 1);
  };
  const selectMerge = (item: Row) => {
    setSelectedMer(item);
    setSelectedItm(null);
    setSelectedMachine(null);
    setItmList([]);
    setMachines([]);
    setMerSelTick((t) => t + 1);
  };

  /* ------------------------------ load doffs ----------------------------- */
  const showData = useCallback(async (mac: Row | null) => {
    const finalMacCode = mac?.MacCode || '';
    if (typeof prpCode == 'undefined' || prpCode == '' || prpCode == null) { showWarning('please select property'); return; }
    if (!yearnumber3) { showWarning('please select year'); return; }
    if (typeof strCode == 'undefined' || strCode == null || strCode == '') { showWarning('please select store'); return; }
    if (!finalMacCode) { showWarning('please select machine'); return; }
    setBusy('load');
    setLoadError('');
    try {
      const payload = {
        txntype: TXNTYPE, prptype: '', prpcode: prpCode, yearno: yearnumber3, strcode: strCode, limit: '',
        maccode: finalMacCode, mercode: merCode, itmcode: itmCode, productionuid: mac?.productionuid || '',
      };
      const body = await prodDoffShow(api, payload);
      if (body?.success) {
        setFilterOpen(false);
        setDoffs(arr(body.data?.main));
        setDoffsNew(arr(body.data?.mainnew));
      } else {
        console.log('API response issue:', body);
        setLoadError(str(body?.message) || 'Could not load doffs for this machine.');
      }
    } catch (error: any) {
      console.log('Machine Change API Error =>', error);
      setLoadError(error?.message || 'Could not load doffs.');
    } finally {
      setBusy('');
    }
  }, [api, prpCode, yearnumber3, strCode, merCode, itmCode]);

  const applyResult = (data: any) => {
    setDoffs(arr(data?.data?.main));
    setDoffsNew(arr(data?.data?.mainnew));
  };

  /* ------------------------------ START doff ----------------------------- */
  const doffAdd = async () => {
    if (busy) return;
    if (!filteredMachine[0]) { showWarning('Please select a machine first'); return; }
    const validation = validateStartDateTime(startDate, startTime, proddate);
    if (!validation.valid) { showWarning(validation.message); return; }
    const finalPayload = buildAddPayload(doffsNew, filteredMachine, startDate, startTime, crit);
    setBusy('add');
    try {
      const data = await postDoff(api, 'proddoffadd', finalPayload);
      if (data?.success) {
        showSuccess('Doff added successfully');
        applyResult(data);
      } else showWarning(data?.message || 'Failed to add doff');
    } catch (error) {
      console.log('API Error:', error);
      showError(apiErrorText(error));
    } finally {
      setBusy('');
    }
  };

  /* ------------------------------- END doff ------------------------------ */
  const doffUpdateEnd = async () => {
    if (busy) return;
    if (!filteredMachine[0]) { showWarning('Please select a machine first'); return; }
    const validation = validateStartDateTime(startDateEnd, startTimeEnd, proddate);
    if (!validation.valid) { showWarning(validation.message); return; }
    if (!firstIncomplete) return;
    const doffId = firstIncomplete.uid || doffs.indexOf(firstIncomplete);
    const finalPayload = buildEndPayload(firstIncomplete, startDateEnd, startTimeEnd, crit);
    setBusy('end');
    try {
      const data = await postDoff(api, 'proddoffedit', finalPayload);
      if (data?.success) {
        showSuccess('Doff updated successfully');
        applyResult(data);
        setEditable((prev) => { const n = { ...prev }; delete n[doffId]; return n; });
      } else showWarning(data?.message || 'Failed to update doff');
    } catch (error) {
      console.log('API Error:', error);
      showError(apiErrorText(error));
    } finally {
      setBusy('');
    }
  };

  /* ---------------------------- card UPDATE ------------------------------ */
  const runUpdate = async (item: Row, validation: boolean) => {
    const doffId = item.uid || doffs.indexOf(item);
    const latest = editable[doffId] || {};
    if (validation) {
      const msg = validateUpdate(item, latest);
      if (msg) { showWarning(msg); return; }
    }
    const finalPayload = buildUpdatePayload(item, latest, crit);
    setBusy('update');
    setBusyId(doffId);
    try {
      const data = await postDoff(api, 'proddoffedit', finalPayload);
      if (data?.success) {
        showSuccess('Doff updated successfully');
        applyResult(data);
        setEditable((prev) => { const n = { ...prev }; delete n[doffId]; return n; });
      } else showWarning(data?.message || 'Failed to update doff');
    } catch (error) {
      console.log('API Error:', error);
      showError(apiErrorText(error));
    } finally {
      setBusy('');
      setBusyId(null);
    }
  };

  /* ---------------------------- card DELETE ------------------------------ */
  const runDelete = async (item: Row) => {
    const doffId = item.uid || doffs.indexOf(item);
    setBusy('delete');
    setBusyId(doffId);
    try {
      const data = await postDoff(api, 'proddoffdelete', buildDeletePayload(item, crit));
      if (data?.success) {
        showSuccess('Doff deleted successfully');
        applyResult(data);
      } else showWarning(data?.message || 'Failed to delete doff');
    } catch (error) {
      console.log('API Error:', error);
      showError(apiErrorText(error));
    } finally {
      setBusy('');
      setBusyId(null);
    }
  };

  /* ------------------------- card field handlers ------------------------- */
  const onField = (item: Row, index: number, field: string, value: any): boolean => {
    const id = doffKey(item, index);
    const r = applyFieldChange(editable, id, item, field, value, proddate);
    if (r.ok === false) { showWarning(r.message); return false; }
    setEditable(r.next);
    return true;
  };

  const pickCardDate = (item: Row, index: number, which: 'start' | 'end', date: Date): boolean => {
    const cur = editable[doffKey(item, index) as any] || {};
    const formatted = formatDateYYYYMMDD(date);
    const parsed = parseYYYYMMDD(formatted);
    if (productionDate && parsed < productionDate) {
      showWarning(`${which === 'start' ? 'Start' : 'End'} date cannot be earlier than the production date (${getDisplayDateFromYYYYMMDD(proddate)})`);
      return false;
    }
    const v = which === 'start'
      ? validateDates(formatted, cur.enddate || item.enddate, proddate)
      : validateDates(cur.startdate || item.startdate, formatted, proddate);
    if (!v.valid) { showWarning(v.message); return false; }
    return onField(item, index, which === 'start' ? 'startdate' : 'enddate', formatted);
  };

  /* ---------------------- START / END accordion pickers ------------------- */
  const pickStartDate = (date: Date): boolean => {
    if (productionDate && date < productionDate) {
      showWarning(`Start date cannot be earlier than ${getDisplayDateFromYYYYMMDD(proddate)}`);
      return false;
    }
    setStartDate(date);
    return true;
  };
  const pickEndDate = (date: Date): boolean => {
    if (productionDate && date < productionDate) {
      showWarning(`End date cannot be earlier than ${getDisplayDateFromYYYYMMDD(proddate)}`);
      return false;
    }
    if (date < startDate) {
      showWarning('End date must be after or equal to start date.');
      return false;
    }
    setStartDateEnd(date);
    return true;
  };

  /* ------------------------------ options -------------------------------- */
  const propOpts: Opt[] = useMemo(() => properties.filter((p) => str(p?.PrpCode) !== '')
    .map((p) => ({ value: str(p.PrpCode), label: str(p.LngName) || str(p.PrpCode) })), [properties]);
  const yearOpts: Opt[] = useMemo(() => years.filter((y) => str(y?.YearName) !== '')
    .map((y) => ({ value: str(y.YearName), label: str(y.YearName) })), [years]);
  const storeOpts: Opt[] = useMemo(() => stores.filter((s) => str(s?.StrCode) !== '')
    .map((s) => ({ value: str(s.StrCode), label: str(s.StrName) || str(s.StrCode) })), [stores]);
  const merOpts: Opt[] = useMemo(() => merList.map((m) => ({ value: str(m.mercode), label: str(m.mername) || str(m.mercode) })), [merList]);
  const itmOpts: Opt[] = useMemo(() => itmList.map((m) => ({ value: str(m.itmcode), label: str(m.itmname) || str(m.itmcode) })), [itmList]);
  const macOpts: Opt[] = useMemo(() => machines.map((m, i) => ({ value: String(i), label: str(m.MacName) || str(m.MacCode), searchText: str(m.MacCode) })), [machines]);
  const macIndex = selectedMachine ? machines.indexOf(selectedMachine) : -1;

  /* ------------------------------ list data ------------------------------ */
  const listRows = useMemo(() => {
    const all = doffs.map((item, index) => ({ item, index }));
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(({ item }) => [
      item.doffno, getDisplayDate(item.startdate), item.starttime, getDisplayDate(item.enddate), item.endtime,
      item.totchees, item.totgrsqty, item.totnetqty,
    ].map(str).join(' ').toLowerCase().includes(q));
  }, [doffs, query]);

  const locked = !!busy;

  /* -------------------------------- header -------------------------------- */
  const critLine1 = [selectedProperty?.LngName, selectedYear, selectedStore?.StrName].map(str).filter(Boolean).join(' · ');
  const critLine2 = [selectedMer?.mername, selectedItm?.itmname].map(str).filter(Boolean).join(' · ');

  const criteriaCard = (
    <View style={s.card}>
      <View style={s.critRow}>
        <View style={s.headIcon}><Icon name="precision-manufacturing" size={20} color={T.copper} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.eyebrow}>MACHINE {isLastDoffFilter ? '· LAST DOFF FILTER' : ''}</Text>
          <Text style={s.critTitle} numberOfLines={1}>{str(selectedMachine?.MacName) || 'No machine selected'}</Text>
          <Text style={s.critSub} numberOfLines={1}>{critLine1 || (propLoading ? 'Loading properties…' : 'Select property, year & store')}</Text>
          {critLine2 ? <Text style={s.critSub} numberOfLines={1}>{critLine2}</Text> : null}
        </View>
      </View>
      <View style={s.critActions}>
        <Btn label="Criteria" icon="tune" kind="ghost" compact onPress={() => setFilterOpen(true)} style={{ flex: 1 }} />
        <Btn
          label={doffs.length ? 'Reload' : 'Load data'}
          icon="refresh"
          kind="primary"
          compact
          onPress={() => showData(selectedMachine)}
          loading={busy === 'load'}
          disabled={locked && busy !== 'load'}
          style={{ flex: 1 }}
        />
      </View>
      {loadError && !filterOpen ? <Text style={s.err}>{loadError}</Text> : null}
    </View>
  );

  const showWork = doffs.length > 0 || !!selectedProperty?.PrpCode;

  const machineCard = (
    <View style={s.kpiWrap}>
      <View style={s.kpiHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.kpiEyebrow}>M/C</Text>
          <Text style={s.kpiTitle} numberOfLines={1}>{str(machine?.MacName) || 'N/A'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', maxWidth: '55%' }}>
          <Text style={s.kpiEyebrow}>R.C. NO</Text>
          <Text style={s.kpiRc} numberOfLines={1}>{str(machine?.prodno) || 'N/A'}</Text>
        </View>
      </View>
      <View style={s.kvGrid}>
        <KVDark k="Qlty" v={machine?.itmname} />
        <KVDark k="Mer" v={machine?.mername} />
        <KVDark k="Shd" v={machine?.shade} />
        <KVDark k="R.C. Date" v={machine?.proddate ? getDisplayDateFromYYYYMMDD(machine?.proddate) : 'N/A'} />
        <KVDark k="Qty" v={machine?.prodqty ? Number(machine?.prodqty).toFixed(3) : 'N/A'} />
      </View>
      <View style={s.kpiRow}>
        <Kpi label="Doffs" value={String(doffs.length)} color="#fff" />
        <Kpi label="Total Chees" value={sums.totchees.toFixed(2)} color="#F3C9A3" />
        <Kpi label="Total Net Wt." value={sums.totnetqty.toFixed(3)} color="#BFE3CF" />
      </View>
    </View>
  );

  const startCard = !hasLastDoff ? (
    <View style={[s.card, s.actCard]}>
      <TouchableOpacity style={s.accHead} onPress={() => setExpanded(!expanded)} accessibilityRole="button" accessibilityState={{ expanded }}>
        <View style={[s.accIcon, { backgroundColor: '#EAF3EE' }]}><Icon name="play-arrow" size={20} color={T.green} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.accTitle}>Start Doff</Text>
          <Text style={s.accSub} numberOfLines={1}>{formatDateDDMMYYYY(startDate)} · {formatTimeWithDot(startTime)}</Text>
        </View>
        <Icon name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color={T.nav} />
      </TouchableOpacity>
      {expanded ? (
        <View style={s.accBody}>
          <Text style={s.fieldLabel}>Start Date & Time</Text>
          <View style={s.row}>
            <DateTimeField mode="date" label="" value={startDate} text={formatDateDDMMYYYY(startDate)}
              minimumDate={productionDate || new Date()} onPick={pickStartDate} />
            <DateTimeField mode="time" label="" value={startTime} text={formatTimeWithDot(startTime)}
              onPick={(t) => { setStartTime(t); return true; }} />
          </View>
          <Btn label="START" icon="play-arrow" kind="copper" onPress={doffAdd} loading={busy === 'add'} disabled={locked && busy !== 'add'} />
        </View>
      ) : null}
    </View>
  ) : null;

  const endCard = !hasLastDoff && isAnyEndEmpty ? (
    <View style={[s.card, s.actCard]}>
      <TouchableOpacity style={s.accHead} onPress={() => setExpandedEnd(!expandedEnd)} accessibilityRole="button" accessibilityState={{ expanded: expandedEnd }}>
        <View style={[s.accIcon, { backgroundColor: '#FBEDEA' }]}><Icon name="stop" size={20} color={T.red} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.accTitle}>End Doff</Text>
          <Text style={s.accSub} numberOfLines={1}>
            {firstIncomplete ? `Doff #${str(firstIncomplete.doffno)} · ` : ''}{formatDateDDMMYYYY(startDateEnd)} · {formatTimeWithDot(startTimeEnd)}
          </Text>
        </View>
        <Icon name={expandedEnd ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color={T.nav} />
      </TouchableOpacity>
      {expandedEnd ? (
        <View style={s.accBody}>
          <Text style={s.fieldLabel}>End Date & Time</Text>
          <View style={s.row}>
            <DateTimeField mode="date" label="" value={startDateEnd} text={formatDateDDMMYYYY(startDateEnd)}
              minimumDate={productionDate || new Date()} onPick={pickEndDate} />
            <DateTimeField mode="time" label="" value={startTimeEnd} text={formatTimeWithDot(startTimeEnd)}
              onPick={(t) => { setStartTimeEnd(t); return true; }} />
          </View>
          <Btn label="END" icon="stop" kind="danger" onPress={doffUpdateEnd} loading={busy === 'end'} disabled={locked && busy !== 'end'} />
        </View>
      ) : null}
    </View>
  ) : null;

  const lockedNote = hasLastDoff ? (
    <View style={s.note}>
      <Icon name="lock-outline" size={16} color={T.red} />
      <Text style={s.noteText}>Last doff is recorded for this R.C. — start, end, update and delete are closed.</Text>
    </View>
  ) : null;

  const noData = (
    <View style={[s.card, s.empty]}>
      <Icon name="assignment" size={44} color={T.border} />
      <Text style={s.emptyTitle}>No Doff Data Available</Text>
      <Text style={s.emptyText}>Please load doff entry by selecting property, year, store and machine</Text>
      <Btn label="Load Doff Data" icon="tune" kind="copper" onPress={() => setFilterOpen(true)} style={{ marginTop: 8 }} />
    </View>
  );

  const listTools = doffs.length > 0 ? (
    <View style={s.toolbar}>
      <Text style={s.listTitle}>Doffs <Text style={{ color: T.muted }}>({listRows.length}{query ? ` of ${doffs.length}` : ''})</Text></Text>
      <View style={[s.search, phone ? { flexBasis: '100%' } : { maxWidth: 360 }]}>
        <Icon name="search" size={18} color={T.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search doff no, date, time…"
          placeholderTextColor={T.muted}
          style={s.searchInput}
          autoCorrect={false}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={18} color={T.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  ) : null;

  const header = (
    <View style={{ gap: 12 }}>
      {criteriaCard}
      {showWork ? (
        <>
          {machineCard}
          {lockedNote}
          {startCard || endCard ? (
            <View style={[s.actRow, phone && { flexDirection: 'column' }]}>
              {startCard}
              {endCard}
            </View>
          ) : null}
        </>
      ) : noData}
      {listTools}
    </View>
  );

  const empty = busy === 'load' ? (
    <View style={s.emptyList}><ActivityIndicator color={T.copper} /><Text style={s.emptyText}>Loading doffs…</Text></View>
  ) : (
    <View style={s.emptyList}>
      <Icon name="inventory-2" size={36} color={T.border} />
      <Text style={s.emptyTitle}>{doffs.length ? 'No match' : 'No doffs found!'}</Text>
      {doffs.length ? <Text style={s.emptyText}>Change the search text.</Text> : null}
    </View>
  );

  return (
    <View style={s.root}>
      <FlatList
        key={`cols-${cols}`}
        data={listRows}
        numColumns={cols}
        extraData={[editable, busy, busyId, hasLastDoff, proddate]}
        keyExtractor={({ item, index }) => `${item.uid || index}`}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: 12 }}
        ListEmptyComponent={empty}
        columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item: { item, index } }) => {
          const id = doffKey(item, index);
          const cur = editable[id as any] || {};
          return (
            <View style={{ flex: 1 / cols, marginBottom: 10, minWidth: 0 }}>
              <DoffCard
                item={item}
                cur={cur}
                isFirst={index === 0}
                hasLastDoff={hasLastDoff}
                minDate={productionDate || minDate}
                maxDate={maxDate}
                busy={busyId === id && (busy === 'update' || busy === 'delete') ? busy : ''}
                locked={locked}
                onPickStartDate={(dt) => pickCardDate(item, index, 'start', dt)}
                onPickEndDate={(dt) => pickCardDate(item, index, 'end', dt)}
                onPickStartTime={(dt) => onField(item, index, 'starttime', formatTimeWithDot(dt))}
                onPickEndTime={(dt) => onField(item, index, 'endtime', formatTimeWithDot(dt))}
                onField={(f, v) => onField(item, index, f, v)}
                onDelete={() => setConfirmDelete(item)}
                onUpdate={() => setConfirmUpdate({ item, validation: true })}
              />
            </View>
          );
        }}
      />

      {/* ----------------------------- criteria sheet ---------------------------- */}
      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        eyebrow="CRITERIA"
        title="Load doff entry"
        wideMax={640}
        notice={loadError ? <Text style={s.err}>{loadError}</Text> : null}
        footer={(
          <>
            <Btn label="Close" kind="ghost" onPress={() => setFilterOpen(false)} style={{ flex: 1 }} />
            <Btn label="Load data" icon="download" kind="copper" onPress={() => showData(selectedMachine)}
              loading={busy === 'load'} disabled={locked && busy !== 'load'} style={{ flex: 2 }} />
          </>
        )}
      >
        <SelectField
          label="Property"
          required
          value={str(prpCode)}
          options={propOpts}
          loading={propLoading}
          placeholder="Select property"
          onRefresh={() => setPropTick((t) => t + 1)}
          onChange={(v) => { const row = properties.find((p) => str(p.PrpCode) === v); if (row) selectProperty(row); }}
        />
        <View style={s.row}>
          <SelectField
            label="Year"
            required
            value={selectedYear}
            options={yearOpts}
            loading={yLoading}
            placeholder="Year"
            onChange={(v) => setSelectedYear(v)}
          />
          <SelectField
            label="Store"
            required
            value={str(strCode)}
            options={storeOpts}
            loading={sLoading}
            placeholder="Select Store"
            onRefresh={() => setPropSelTick((t) => t + 1)}
            onChange={(v) => { const row = stores.find((x) => str(x.StrCode) === v); if (row) setSelectedStore(row); }}
          />
        </View>
        <View style={s.switchBox}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchTitle}>Last Doff</Text>
            <Text style={s.switchSub}>Show machines filtered by last doff</Text>
          </View>
          <Switch
            value={isLastDoffFilter}
            onValueChange={(v) => { setIsLastDoffFilter(v); setSelectedMachine(null); }}
            trackColor={{ false: T.border, true: T.nav }}
            thumbColor="#fff"
          />
        </View>
        <SelectField
          label="Merge"
          value={str(merCode)}
          options={merOpts}
          loading={mLoading}
          placeholder="Select merge"
          onRefresh={() => setCritTick((t) => t + 1)}
          onChange={(v) => { const row = merList.find((m) => str(m.mercode) === v); if (row) selectMerge(row); }}
        />
        <SelectField
          label="Item"
          value={str(itmCode)}
          options={itmOpts}
          loading={iLoading}
          placeholder="Select item"
          onRefresh={() => setCritTick((t) => t + 1)}
          onChange={(v) => { const row = itmList.find((m) => str(m.itmcode) === v); if (row) setSelectedItm(row); }}
        />
        <SelectField
          label="Machine"
          required
          value={macIndex >= 0 ? String(macIndex) : ''}
          options={macOpts}
          loading={macLoading}
          placeholder="Select machine"
          onRefresh={() => setCritTick((t) => t + 1)}
          onChange={(v) => { const row = machines[Number(v)]; if (row) setSelectedMachine(row); }}
        />
      </Sheet>

      {/* ----------------------------- delete confirm ---------------------------- */}
      <Sheet
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        eyebrow="CONFIRM"
        title="Confirm Delete"
        wideMax={480}
        footer={(
          <>
            <Btn label="Cancel" kind="ghost" onPress={() => setConfirmDelete(null)} style={{ flex: 1 }} />
            <Btn label="Yes, delete" icon="delete" kind="danger" style={{ flex: 2 }}
              onPress={() => { const it = confirmDelete; setConfirmDelete(null); if (it) runDelete(it); }} />
          </>
        )}
      >
        <Text style={s.confirmText}>Are you sure you want to delete this doff entry?</Text>
        {confirmDelete ? <ConfirmFacts item={confirmDelete} /> : null}
      </Sheet>

      {/* ----------------------------- update confirm ---------------------------- */}
      <Sheet
        open={!!confirmUpdate}
        onClose={() => setConfirmUpdate(null)}
        eyebrow="CONFIRM"
        title="Confirm Update"
        wideMax={480}
        footer={(
          <>
            <Btn label="Cancel" kind="ghost" onPress={() => setConfirmUpdate(null)} style={{ flex: 1 }} />
            <Btn label="Yes, update" icon="save" kind="copper" style={{ flex: 2 }}
              onPress={() => { const cu = confirmUpdate; setConfirmUpdate(null); if (cu) runUpdate(cu.item, cu.validation); }} />
          </>
        )}
      >
        <Text style={s.confirmText}>Are you sure you want to update this doff entry?</Text>
        {confirmUpdate ? (
          <ConfirmFacts item={confirmUpdate.item} cur={editable[doffKey(confirmUpdate.item, doffs.indexOf(confirmUpdate.item)) as any]} />
        ) : null}
      </Sheet>
    </View>
  );
}

/* --------------------------------- pieces ---------------------------------- */

function KVDark({ k, v }: { k: string; v: any }) {
  return (
    <View style={s.kvD}>
      <Text style={s.kvDK} numberOfLines={1}>{k}</Text>
      <Text style={s.kvDV} numberOfLines={2}>{str(v) || 'N/A'}</Text>
    </View>
  );
}

function ConfirmFacts({ item, cur }: { item: Row; cur?: Row }) {
  const e = cur || {};
  const pick = (f: string) => (e[f] !== undefined && e[f] !== '' ? e[f] : item[f]);
  return (
    <View style={s.kvGridLight}>
      <KV k="Doff" v={`#${str(item.doffno)}`} />
      <KV k="Start" v={`${getDisplayDate(pick('startdate'))} ${str(pick('starttime'))}`} />
      <KV k="End" v={`${getDisplayDate(pick('enddate'))} ${str(pick('endtime'))}`} />
      <KV k="Chees" v={pick('totchees')} />
      <KV k="Gross Wt." v={pick('totgrsqty')} />
      <KV k="Net Wt." v={pick('totnetqty') !== undefined && pick('totnetqty') !== '' ? fmt(pick('totnetqty'), 3) : ''} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 12, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, ...S.card },
  critRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#FBF1E8', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.1 },
  critTitle: { fontSize: 15, fontWeight: '800', color: T.nav, marginTop: 1 },
  critSub: { fontSize: 12, color: T.muted, marginTop: 1, fontWeight: '500' },
  critActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  err: { fontSize: 12, color: T.red, fontWeight: '700', marginTop: 8 },
  kpiWrap: { backgroundColor: T.nav, borderRadius: 12, padding: 12, gap: 10 },
  kpiHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  kpiEyebrow: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  kpiTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 1 },
  kpiRc: { fontSize: 15, fontWeight: '800', color: '#F3C9A3', marginTop: 1 },
  kvGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  kvD: { width: '33.33%', paddingRight: 8, minWidth: 0 },
  kvDK: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4, textTransform: 'uppercase' },
  kvDV: { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 1 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, borderRadius: 10, backgroundColor: '#FBEDEA', borderWidth: 1, borderColor: 'rgba(178,58,42,0.25)' },
  noteText: { flex: 1, fontSize: 12, color: T.red, fontWeight: '600', lineHeight: 17 },
  actRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  actCard: { flex: 1, minWidth: 0, padding: 0, overflow: 'hidden' },
  accHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  accIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  accTitle: { fontSize: 14.5, fontWeight: '800', color: T.nav },
  accSub: { fontSize: 12, color: T.muted, marginTop: 1, fontWeight: '600' },
  accBody: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 10, gap: 10, borderTopWidth: 1, borderTopColor: T.hair },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 10 },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20, gap: 6 },
  emptyList: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: T.nav, textAlign: 'center' },
  emptyText: { fontSize: 13, color: T.muted, textAlign: 'center' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  listTitle: { fontSize: 14, fontWeight: '800', color: T.nav },
  search: { flexGrow: 1, height: 42, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: T.ink, height: 40 },
  switchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  switchTitle: { fontSize: 13, fontWeight: '800', color: T.nav },
  switchSub: { fontSize: 11.5, color: T.muted, marginTop: 1 },
  confirmText: { fontSize: 14, color: T.ink, fontWeight: '600' },
  kvGridLight: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 6, borderTopWidth: 1, borderTopColor: T.hair },
});
