// FILE: src/screens/creelManagement/CreelManagementModule.tsx
// NEW ERP — Creel Management System.
//
// Legacy source (route app/(tabs)/creel-management-system.tsx):
//   components/CreelManagementSystem/index.tsx      (browser, creel form, scan/issue, summary)
//   components/CreelManagementSystem/CustomDrawer.tsx (filter drawer)
//   helpers: common/API/Functions (fetchPropertyData, fetchAllYeardata),
//            hooks/useMobileUserPreference + common/API/mobileUserPreferenceApi
//
// Flow (same as legacy):
//   Session   AsyncStorage 'user_prptype' (prptype), 'yno', 'user_id' (userid, as the legacy route passes it).
//   Open      GET getproperty -> first property; GET getyear -> current FY (else first).
//             If user_id: POST mobile-user-preference/get (CREEL / CREEL_BROWSER) -> saved criteria
//             (PrpCode, YearNo, fromdate [default 1st of month], todate [default today], status, StkType).
//             Property change -> GET getyear.  Property / Year change -> machines + shifts (get_criterion).
//   Browse    Filters: property, year, from / to, Pending | Completed. Apply validates property + year,
//             from/to inside the selected FY (1-Apr .. 31-Mar), from <= to ->
//             POST get_yarn_issue_browse (yearno = CURRENT FY, include_drafts 1) -> save preference
//             -> Completed keeps CreelQty == 0 rows, Pending keeps CreelQty != 0 ("No Record Found" when empty).
//             Local search on CreelId / IssDate / Shift / CreelQty.
//             Card: Creel ID, Pending/Complete (CreelQty), DRAFT/FINAL, vou no, shift, date, qty (3 dp),
//             Edit -> POST resume_creel_session (DRAFT) or get_yarn_issue_show (else) -> scan screen;
//             Delete -> confirm -> POST discard_creel_session {prpcode, yearno, uid} -> success -> reload.
//   New creel Property, Machine (get_criterion machine, WRP) -> Creel ID (get_criterion get_creelid, read only),
//             Setup date, Shift, Stock type (In house I / Process house P), Remark. Validation (machine,
//             creel id, date, shift, stock type, date inside FY) -> POST start_creel_session -> UID, DRAFT.
//   Scan      QR (~ separated, 16 / 13+ / 11+ parts) -> item names (get_item_detail_from_carton);
//             JSON QR -> get_auto_checking_help (legacy sendScannedValue). Manual: get_carton_search.
//             Chees / Qty prefilled with available. Submit: session + FINAL + duplicate checks,
//             <= available, > 0 -> optimistic row -> POST add_single_carton_scan (Laravel success rules
//             ported verbatim) -> row confirmed or removed with Laravel's message.
//   Summary   Items + Total Qty (3 dp). DRAFT: delete carton (delete_creel_single_data) and Discard
//             (confirm -> discard_creel_session + txntype -> OK -> reload). Submit All ->
//             POST finalize_creel_session -> FINAL -> Success -> reload list.
//
// Endpoints: see creelManagementApi.ts (getproperty, getyear, mobile-user-preference/get|save,
//   get_criterion shift|machine|get_creelid, get_yarn_issue_browse, resume_creel_session,
//   get_yarn_issue_show, start_creel_session, add_single_carton_scan, finalize_creel_session,
//   discard_creel_session, delete_creel_single_data, get_carton_search, get_item_detail_from_carton,
//   get_auto_checking_help).
//
// Differences vs legacy:
//   1. Host comes from the API prop (ErpSessionGate) for every call, incl. the preference API (legacy
//      used initAPI()); getproperty result is not written to AsyncStorage 'get_property'.
//   2. The saved preference is applied once on open (legacy re-applied it every time the property /
//      year lists reloaded, snapping a newly picked property back to the saved one), and the list is
//      loaded once on open with those criteria (legacy showed an empty list until Apply); an empty
//      result on this automatic load shows the empty state instead of the "No Record Found" alert.
//   3. Snackbar toasts (finalize / carton delete / list delete failures) are shown with AppAlert.
//   4. Carton "Submit" switches to the carton list only after the local validations pass (legacy
//      switched even when a validation alert was shown).
//   5. Stock type is really required on "Save & Next" (legacy's check tested an initial [] that is always
//      truthy, so an empty StkType could be sent).
//   6. Setup date is sent as the LOCAL calendar day (legacy used toISOString(), i.e. the UTC day, which is
//      the previous day between 00:00 and 05:30 IST).
//   7. Browse search box and manual carton search have separate text (legacy shared one state).
//   8. The preference save after a browse is fire-and-forget (legacy awaited it, so a failing save
//      dropped the browse result).
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, BackHandler, FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import {
  Banner, Btn, Card, Chip, DateField, EmptyState, Field, HIT, KV, MONO, PickerSheet, Pill, SelectBox, useWide, ViewShell,
} from '../inquiry/ui';
import {
  cartonSaveError, createCreelApi, getCurrentFinancialYear, getLaravelResponsePayload, getStatusFromQty, isLaravelSuccess,
  isoDay, isoToDmy, mapShow, parseDate, parseQr, STOCK_TYPES, str, toIso,
} from './creelManagementApi';
import { CartonSearchSheet, ScannerModal } from './CreelParts';

type Props = { token: string; API: string; username?: string };
type Step = 'list' | 'creel' | 'scan';
type Form = {
  // PrpCode / YearNo keep the raw API value (number or string) — legacy sent them uncoerced.
  PrpCode: any; YearNo: any; fromdate: string; todate: string; status: string;
  LngName: string; YearName: string; StkType: string; MacCode: string;
};

const EMPTY_FORM: Form = { PrpCode: '', YearNo: '', fromdate: '', todate: '', status: 'P', LngName: '', YearName: '', StkType: '', MacCode: '' };
const todayDmy = () => isoToDmy(isoDay(new Date()));

export default function CreelManagementModule({ token, API }: Props) {
  const api = useMemo(() => createCreelApi(API, token), [API, token]);
  const { wide, xwide } = useWide();
  const [step, setStep] = useState<Step>('list');

  /* ------------------------------ session ------------------------------ */
  const [session, setSession] = useState<{ prptype: string | null; yno: string | null; userid: string | number } | null>(null);
  useEffect(() => {
    Promise.all(['user_prptype', 'yno', 'user_id'].map((k) => AsyncStorage.getItem(k).catch(() => null))).then(([p, y, u]) => {
      setSession({ prptype: p ?? null, yno: y ?? null, userid: u || 0 });
    });
  }, []);

  /* ------------------------------ criteria ------------------------------ */
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const formRef = useRef(form);
  formRef.current = form;
  const patchForm = useCallback((p: Partial<Form>) => setForm((cur) => ({ ...cur, ...p })), []);
  const yearOf = () => formRef.current.YearNo || getCurrentFinancialYear();

  const [properties, setProperties] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  /* ------------------------------ browse ------------------------------ */
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheet, setSheet] = useState<null | 'prp' | 'year' | 'cprp' | 'mac' | 'shift' | 'stk'>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState<any>(null);
  const [ready, setReady] = useState(false);

  /* ------------------------------ creel header ------------------------------ */
  const [creelId, setCreelId] = useState('');
  const [setupDate, setSetupDate] = useState(todayDmy());
  const [shift, setShift] = useState('');
  const [stocktype, setstocktype] = useState('');
  const [remark, setRemark] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [selectedStock, setSelectedStock] = useState<any>(null);

  /* ------------------------------ scan / session ------------------------------ */
  const [mainUId, setMainUId] = useState<any>(null);
  const [sessionStatus, setSessionStatus] = useState<'DRAFT' | 'FINAL' | ''>('');
  const [cartons, setCartons] = useState<any[]>([]);
  const [scanned, setScanned] = useState<Record<string, any>>({});
  const [cartonNo, setCartonNo] = useState('');
  const [chees, setChees] = useState('');
  const [avgwt, setAvgwt] = useState('');
  const [showList, setShowList] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDelete, setIsDelete] = useState(false);

  /* ------------------------------ loaders ------------------------------ */
  const loadMachineShift = useCallback((prpCode: any) => {
    if (!session) return;
    api.machines({ prptype: session.prptype, prpcode: prpCode || formRef.current.PrpCode, yearno: getCurrentFinancialYear() })
      .then(setMachines).catch(() => undefined);
    api.shifts({ prptype: session.prptype, prpcode: prpCode || formRef.current.PrpCode, yearno: yearOf() })
      .then(setShifts).catch(() => undefined);
  }, [api, session]); // eslint-disable-line react-hooks/exhaustive-deps

  /** legacy fetchBrowseData */
  const fetchBrowseData = useCallback(async (opts?: { silentEmpty?: boolean; spinner?: boolean }) => {
    const f = formRef.current;
    if (opts?.spinner !== false) setIsLoading(true);
    try {
      const data = await api.browse({
        prpcode: f.PrpCode || '', prptype: session?.prptype ?? null, yearno: getCurrentFinancialYear(),
        fromdate: f.fromdate || '', todate: f.todate || '', status: f.status || '',
      });
      const apiData: any[] = Array.isArray(data?.response?.data) ? data.response.data : [];
      if (session?.userid) {
        api.savePreference(Number(session.userid), {
          criteria: {
            PrpCode: f.PrpCode, YearNo: f.YearNo || getCurrentFinancialYear(), fromdate: f.fromdate, todate: f.todate,
            status: f.status, StkType: f.StkType,
          },
        }).catch(() => undefined);
      }
      if (data?.success) {
        const finalData = f.status === 'C'
          ? apiData.filter((it) => parseFloat(it.CreelQty || 0) === 0)
          : apiData.filter((it) => parseFloat(it.CreelQty || 0) !== 0);
        setRows(finalData);
        if (finalData.length > 0) setFiltersOpen(false);
        else if (!opts?.silentEmpty) AppAlert.alert('No Record Found', 'No data available');
      }
    } catch {
      // legacy: logged only
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [api, session]);

  // open: properties -> years -> saved preference -> first browse
  useEffect(() => {
    if (!session || !token) return;
    let alive = true;
    (async () => {
      setIsLoading(true);
      try {
        const props = await api.properties().catch(() => []);
        if (!alive) return;
        setProperties(props);
        let next: Form = { ...formRef.current };
        let yrs: any[] = [];
        if (props.length) {
          const prpCode = props[0].PrpCode;
          yrs = await api.years(prpCode).catch(() => []);
          if (!alive) return;
          setYears(yrs);
          const cur = yrs.find((y) => String(y.YearNo) === String(getCurrentFinancialYear())) || yrs[0];
          next = { ...next, PrpCode: prpCode, LngName: str(props[0].LngName), YearNo: cur?.YearNo || '', YearName: str(cur?.YearName) };
        }
        if (session.userid) {
          const saved = await api.loadPreference(Number(session.userid)).catch(() => null);
          const c = saved?.criteria;
          if (c) {
            const today = new Date();
            const first = new Date(today.getFullYear(), today.getMonth(), 1);
            // legacy normalizeCriteria (formatDate = toISOString day)
            next = {
              ...next,
              PrpCode: c.PrpCode || '', YearNo: c.YearNo || '',
              fromdate: str(c.fromdate || first.toISOString().split('T')[0]),
              todate: str(c.todate || today.toISOString().split('T')[0]),
              status: str(c.status || 'P'), StkType: str(c.StkType || ''),
            };
            const p = props.find((x) => String(x.PrpCode) === String(next.PrpCode));
            next.LngName = p ? str(p.LngName) : '';
            const y = String(next.PrpCode) === String(props[0]?.PrpCode) ? yrs.find((x) => String(x.YearNo) === String(next.YearNo)) : null;
            next.YearName = y ? str(y.YearName) : ''; // filled by the getyear effect otherwise
            const stk = STOCK_TYPES.find((x) => String(x.StkType) === String(next.StkType));
            if (stk) setSelectedStock(stk);
          }
        }
        if (!alive) return;
        formRef.current = next;
        setForm(next);
        setReady(true);
        if (next.PrpCode && next.YearNo) await fetchBrowseData({ silentEmpty: true, spinner: false });
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [api, session, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // property change -> years (legacy useEffect on FormState.values.PrpCode)
  useEffect(() => {
    if (!ready || !form.PrpCode) return;
    api.years(form.PrpCode).then((yrs) => {
      setYears(yrs);
      setForm((cur) => {
        if (cur.YearName || !cur.YearNo) return cur;
        const y = yrs.find((x) => String(x.YearNo) === String(cur.YearNo));
        return y ? { ...cur, YearName: str(y.YearName) } : cur;
      });
    }).catch(() => undefined);
  }, [api, ready, form.PrpCode]);

  // property / year -> machines + shifts
  useEffect(() => {
    if (!token || !form.PrpCode || !form.YearNo || !session) return;
    loadMachineShift(form.PrpCode);
  }, [token, form.PrpCode, form.YearNo, session, loadMachineShift]);

  /* ------------------------------ browse actions ------------------------------ */
  const handleLoadPress = () => {
    const { PrpCode, YearNo, fromdate, todate } = formRef.current;
    if (!PrpCode || !YearNo) { AppAlert.alert('Validation', 'Please select Property and Year'); return; }
    const yearNo = parseInt(YearNo, 10);
    const fyStart = new Date(2000 + yearNo - 1, 3, 1);
    const fyEnd = new Date(2000 + yearNo, 2, 31, 23, 59, 59);
    const from = parseDate(fromdate);
    const to = parseDate(todate);
    if (from < fyStart || to > fyEnd) {
      AppAlert.alert('Validation', `Date must be between ${fyStart.toLocaleDateString()} and ${fyEnd.toLocaleDateString()}`);
      return;
    }
    if (from > to) { AppAlert.alert('Validation', 'From Date cannot be greater than To Date'); return; }
    void fetchBrowseData();
    setFiltersOpen(false);
  };

  const pickFilterProperty = async (item: any) => {
    const prpCode = item?.PrpCode || '';
    patchForm({ PrpCode: prpCode, LngName: str(item?.LngName), YearNo: '', YearName: '' });
    setSheet(null);
    const yrs = await api.years(prpCode).catch(() => []);
    setYears(yrs);
    if (yrs.length) {
      const cur = yrs.find((y) => String(y.YearNo) === String(getCurrentFinancialYear())) || yrs[0];
      patchForm({ PrpCode: prpCode, LngName: str(item?.LngName), YearNo: cur.YearNo, YearName: str(cur.YearName) });
    }
  };

  const resetFilters = () => patchForm({ PrpCode: '', LngName: '', YearNo: '', YearName: '', fromdate: '', todate: '' });

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    if (!t) return rows;
    return rows.filter((it) => [it.CreelId, it.IssDate, it.Shift, it.CreelQty].some((v) => v?.toString().toLowerCase().includes(t)));
  }, [rows, q]);

  /* ------------------------------ reset (legacy resetAllFields) ------------------------------ */
  const resetScanFields = () => {
    setCartonNo(''); setChees(''); setAvgwt(''); setScanned({}); setScanOpen(false); setSearchOpen(false);
  };
  const resetAllFields = () => {
    setMainUId(null); setSessionStatus('');
    setCreelId(''); setShift(''); setstocktype(''); setRemark(''); setSelectedMachine(null);
    resetScanFields();
    setCartons([]);
  };

  /** legacy success-modal OK: close, clear, reload */
  const afterSuccess = () => {
    setStep('list');
    setShowList(false);
    setCartons([]);
    resetScanFields();
    setCreelId(''); setShift(''); setRemark(''); setstocktype('');
    setSetupDate(todayDmy());
    void fetchBrowseData();
  };

  const backToList = () => { setStep('list'); setShowList(false); void fetchBrowseData(); };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'list') return false;
      if (step === 'scan') backToList();
      else { setStep('list'); resetAllFields(); }
      return true;
    });
    return () => sub.remove();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------ edit / delete from list ------------------------------ */
  const handleViewClick = async (item: any) => {
    if (!item) return;
    setOpening(item.UId);
    setIsLoading(true);
    try {
      const draft = String(item.SessionStatus || item.Status || '').toUpperCase() === 'DRAFT';
      const res = await api.show(draft, { uid: item.UId, prpcode: formRef.current.PrpCode, yearno: yearOf() });
      if (res?.success) {
        const resData = res.response || {};
        const main = Array.isArray(resData.main) ? resData.main : [];
        if (main.length > 0) {
          const h = main[0];
          setCreelId(str(h.BatchNo || ''));
          setSessionStatus(String(h.Status || item.SessionStatus || 'FINAL').toUpperCase() as 'DRAFT' | 'FINAL');
          setShift(str(h.ImTag || ''));
          setstocktype(str(h.StkType || ''));
          setRemark(str(h.Remark || ''));
          setForm((cur) => ({ ...cur, StkType: str(h.StkType || cur.StkType || ''), MacCode: str(h.IssTo || cur.MacCode || '') }));
        }
        setCartons(mapShow(resData, yearOf()));
        setMainUId(item.UId);
        resetScanFields();
        setShowList(false);
        setStep('scan');
      } else {
        AppAlert.alert('Error', 'No data found');
      }
    } catch {
      // legacy: logged only
    } finally {
      setIsLoading(false);
      setOpening(null);
    }
  };

  const confirmDelete = (item: any) => {
    AppAlert.alert('Delete Creel', `Are you sure you want to delete this Creel ${str(item.CreelId)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDelete(true);
          try {
            const res = await api.discard({ prpcode: formRef.current.PrpCode, yearno: yearOf(), uid: item.UId });
            if (res?.success === true) {
              resetAllFields();
              AppAlert.alert('Success', str(res.response?.message || res.message), [{ text: 'OK', onPress: afterSuccess }]);
            } else {
              AppAlert.alert('Error', str(res?.message || 'Delete failed'));
            }
          } catch {
            // legacy: logged only
          } finally {
            setIsDelete(false);
          }
        },
      },
    ]);
  };

  const openNew = () => {
    resetAllFields();
    setShowList(false);
    setStep('creel');
  };

  /* ------------------------------ creel form ------------------------------ */
  const pickMachine = async (item: any) => {
    setSelectedMachine(item);
    patchForm({ MacCode: item?.MacCode });
    setSheet(null);
    try {
      setCreelId(await api.creelId({ prptype: session?.prptype ?? null, prpcode: formRef.current.PrpCode, yearno: getCurrentFinancialYear(), maccode: item?.MacCode }));
    } catch {
      // legacy: ignored
    }
  };

  const saveAndNext = () => {
    if (!selectedMachine) { AppAlert.alert('Validation', 'Select Machine'); return; }
    if (!creelId?.trim()) { AppAlert.alert('Validation', 'Enter Creel ID'); return; }
    const sd = toIso(setupDate);
    if (!sd) { AppAlert.alert('Validation', 'Select Setup Date'); return; }
    if (!shift) { AppAlert.alert('Validation', 'Select Shift'); return; }
    if (!selectedStock) { AppAlert.alert('Validation', 'Select Stock Type'); return; }
    const yearNo = yearOf();
    const fyStart = `20${parseInt(yearNo, 10) - 1}-04-01`;
    const fyEnd = `20${yearNo}-03-31`;
    if (sd < fyStart || sd > fyEnd) {
      AppAlert.alert(' ', '⚠️ Date could not be less than current financial year.', [{ text: 'OK', style: 'default' }], { cancelable: true });
      return;
    }
    void startCreelSession(sd);
  };

  const startCreelSession = async (sd: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const f = formRef.current;
      const res = await api.startSession({
        PrpCode: f.PrpCode, YearNo: yearOf(), CreelId: creelId, SetupDate: sd, Shift: shift, Remark: remark || '',
        StkType: f.StkType || stocktype || '', IssTo: f.MacCode,
      });
      if (!res?.success) throw new Error(res?.message || 'Unable to start creel session.');
      const data = res?.response || {};
      const uid = Number(data.uid || data.UId || 0);
      if (!uid) throw new Error('Server did not return the creel session UID.');
      setMainUId(uid);
      setCreelId(str(data.CreelId || data.BatchNo || creelId));
      setSessionStatus('DRAFT');
      setCartons([]);
      resetScanFields();
      setShowList(false);
      setStep('scan');
    } catch (e: any) {
      AppAlert.alert('Unable to Start', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ------------------------------ scan / cartons ------------------------------ */
  const onScan = (value: string) => {
    setScanOpen(false);
    const parsed = parseQr(value);
    if (!parsed) { AppAlert.alert('Invalid QR', 'QR format not valid'); return; }
    setScanned(parsed);
    setCartonNo(str(parsed.CartNo || ''));
    setChees(str(parsed.Chees || ''));
    setAvgwt(str(parsed.Wt || ''));
    // legacy fetchitmgrdshdname
    setIsLoading(true);
    api.itemNames({ prpcode: formRef.current.PrpCode, yearno: yearOf(), itmcode: parsed.ItmCode, mercode: parsed.MerCode, grdcode: parsed.GrdCode, shdcode: parsed.ShdCode })
      .then((d) => {
        if (d) setScanned((cur) => ({ ...cur, ItmName: d.ItmName || '', MerName: d.MerName || '', ShdName: d.ShdName || '', GrdName: d.GrdName || '' }));
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
    // legacy sendScannedValue (JSON.parse of the QR text; a '~' QR throws and nothing is sent)
    let temp: any;
    try { temp = JSON.parse(value); } catch { return; }
    api.autoCheckingHelp(temp, session?.yno ?? null).then((d) => {
      if (!(d?.success && d?.response?.data)) AppAlert.alert(str(d?.message || 'Unexpected response'));
    }).catch(() => undefined);
  };

  const onManualPick = (it: any) => {
    setSearchOpen(false);
    const data = {
      CartNo: it.CartNo, ItmName: it.ItmName, MerName: it.MerName, ShdName: it.ShdName, GrdName: it.GrdName,
      Chees: it.Chees, Wt: it.Wt, PUId: it.PUId, PSrNo: it.PSrNo, PSubSr: it.PSubSr, TranType: it.TranType,
      ItmCode: it.ItmCode, MerCode: it.MerCode, GrdCode: it.GrdCode, ShdCode: it.ShdCode, Denier: it.Denier,
      yearNo: it.yearno, SrNo: it.SrNo, PrpCode: it.PrpCode, Rate: it.Rate,
    };
    setCartonNo(str(data.CartNo || ''));
    setChees(str(data.Chees || ''));
    setAvgwt(str(data.Wt || ''));
    setScanned(data);
  };

  /** legacy handleAddCarton */
  const handleAddCarton = async () => {
    if (!cartonNo) { AppAlert.alert('Error', 'Please scan carton first'); return; }
    if (!mainUId) { AppAlert.alert('Session Error', 'Creel session is not started. Please go back and tap Save & Next again.'); return; }
    if (sessionStatus === 'FINAL') { AppAlert.alert('Completed', 'This creel is already FINAL and cannot accept more cartons.'); return; }
    const normalizedCartonNo = String(cartonNo || '').trim();
    if (cartons.some((it) => String(it?.cartonNo ?? it?.CartNo ?? '').trim() === normalizedCartonNo)) {
      AppAlert.alert('Duplicate Carton', `Carton ${normalizedCartonNo} is already added in this creel.`);
      return;
    }
    const enteredChees = parseFloat(chees || '0');
    const enteredQty = parseFloat(avgwt || '0');
    const availableChees = parseFloat(scanned?.Chees || '0');
    const availableQty = parseFloat(scanned?.Wt || '0');
    if (availableChees > 0 && enteredChees > availableChees) {
      AppAlert.alert('Validation Error', `Entered Chees (${enteredChees}) cannot be greater than Available Chees (${availableChees}).`);
      return;
    }
    if (availableQty > 0 && enteredQty > availableQty) {
      AppAlert.alert('Validation Error', `Entered Quantity (${enteredQty}) cannot be greater than Available Quantity (${availableQty}).`);
      return;
    }
    if (!Number.isFinite(enteredChees) || enteredChees <= 0) { AppAlert.alert('Validation Error', 'Chees must be greater than 0.'); return; }
    if (!Number.isFinite(enteredQty) || enteredQty <= 0) { AppAlert.alert('Validation Error', 'Qty must be greater than 0.'); return; }

    const f = formRef.current;
    const cartonPayload = {
      PrpCode: scanned?.PrpCode || f.PrpCode || '',
      CartNo: normalizedCartonNo, Chees: enteredChees, Wt: enteredQty,
      PUId: scanned?.PUId, PSrNo: scanned?.PSrNo, PSubSr: scanned?.PSubSr, TranType: scanned?.TranType,
      ItmCode: scanned?.ItmCode, MerCode: scanned?.MerCode, GrdCode: scanned?.GrdCode, ShdCode: scanned?.ShdCode,
      Denier: scanned?.Denier || 0, Rate: scanned?.Rate || 0, ExpProdQty: 0,
      DsnRcpSrNo: scanned?.DsnRcpSrNo || 0, DsnCode: scanned?.DsnCode || 0,
    };
    const optimisticKey = `pending-${Date.now()}-${normalizedCartonNo}`;
    const optimisticRow: Record<string, any> = {
      optimisticKey, cartonNo: normalizedCartonNo, CartNo: normalizedCartonNo, chees: enteredChees, qty: enteredQty,
      ...scanned, UId: mainUId, isPending: true,
    };
    setCartons((prev) => [...prev, optimisticRow]);
    setCartonNo(''); setChees(''); setAvgwt(''); setScanned({});
    setShowList(true);

    try {
      const response = await api.addCarton({ uid: mainUId, prpcode: f.PrpCode, yearno: yearOf(), carton: cartonPayload });
      if (!isLaravelSuccess(response)) throw response;
      const rawSaved = response?.data?.response || {};
      const saved = rawSaved?.data && typeof rawSaved.data === 'object'
        && (rawSaved.data?.SrNo !== undefined || rawSaved.data?.SubSr !== undefined || rawSaved.data?.carton !== undefined)
        ? rawSaved.data : rawSaved;
      const savedCarton = saved?.carton || cartonPayload;
      setCartons((prev) => prev.map((it) => (it.optimisticKey === optimisticKey ? {
        ...optimisticRow,
        ...savedCarton,
        cartonNo: savedCarton.CartNo || optimisticRow.cartonNo,
        CartNo: savedCarton.CartNo || optimisticRow.CartNo,
        chees: savedCarton.Chees ?? optimisticRow.chees,
        qty: savedCarton.Wt ?? savedCarton.Qty ?? optimisticRow.qty,
        SrNo: saved.SrNo ?? savedCarton.SrNo,
        d1SrNo: String(saved.SrNo ?? savedCarton.SrNo ?? ''),
        SubSr: saved.SubSr ?? savedCarton.SubSr,
        SubSrNo: saved.SubSr ?? savedCarton.SubSr,
        UId: mainUId,
        isPending: false,
        optimisticKey: undefined,
      } : it)));
    } catch (error: any) {
      setCartons((prev) => prev.filter((it) => it.optimisticKey !== optimisticKey));
      console.log('add_single_carton_scan failed', getLaravelResponsePayload(error));
      const { title, message } = cartonSaveError(error, `Unable to save carton ${normalizedCartonNo}. Please scan again.`);
      AppAlert.alert(title, message);
    }
  };

  const confirmCartonDelete = (item: any, index: number) => {
    if (!item?.UId) {
      // legacy handleDelete (local row)
      AppAlert.alert('Delete', 'Are you sure you want to remove this carton?', [
        { text: 'Cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => setCartons((prev) => prev.filter((_, i) => i !== index)) },
      ]);
      return;
    }
    AppAlert.alert('Delete Creel', `Are you sure you want to delete this Carton ${str(item.cartonNo)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDelete(true);
          try {
            const res = await api.deleteCarton({
              cartonno: item.cartonNo, srno: item.SrNo, subsrno: item.SubSrNo, uid: item.UId, prpcode: formRef.current.PrpCode, yearno: yearOf(),
            });
            if (res?.success === true) {
              setCartons((prev) => prev.filter((row) => !(
                String(row.UId) === String(item.UId)
                && String(row.SrNo) === String(item.SrNo)
                && String(row.SubSrNo ?? row.SubSr) === String(item.SubSrNo ?? item.SubSr)
              )));
              AppAlert.alert('Deleted', str(res.response?.message || res.message || 'Carton deleted successfully.'));
            } else {
              AppAlert.alert('Error', str(res?.message || 'Delete failed'));
            }
          } catch {
            // legacy: logged only
          } finally {
            setIsDelete(false);
          }
        },
      },
    ]);
  };

  /** legacy handleFinalSubmit */
  const handleFinalSubmit = async () => {
    if (!mainUId) { AppAlert.alert('Session Error', 'Creel session UID is missing.'); return; }
    if (cartons.some((it) => it.isPending)) { AppAlert.alert('Please Wait', 'One or more carton scans are still being saved.'); return; }
    if (cartons.length === 0) { AppAlert.alert('Validation', 'At least one carton is required.'); return; }
    setIsSaving(true);
    try {
      const res = await api.finalize({ uid: mainUId, prpcode: formRef.current.PrpCode, yearno: yearOf() });
      if (!res?.success) throw new Error(res?.message || 'Unable to finalize creel.');
      setSessionStatus('FINAL');
      AppAlert.alert('Success', str(res.message || 'Creel submitted successfully.'), [{ text: 'OK', onPress: afterSuccess }]);
    } catch (e: any) {
      AppAlert.alert('Error', e?.response?.data?.message || e?.message || 'Unable to finalize creel.');
    } finally {
      setIsSaving(false);
    }
  };

  /** legacy discardDraftSession */
  const discardDraftSession = () => {
    if (!mainUId || sessionStatus !== 'DRAFT') return;
    AppAlert.alert('Discard Draft Creel', 'This will reverse stock for every scanned carton and permanently delete this draft. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          setIsDelete(true);
          try {
            const res = await api.discard({ uid: mainUId, prpcode: formRef.current.PrpCode, yearno: yearOf(), txntype: 'creel_yarn_issue' });
            const apiMessage = res?.response?.message || res?.message || 'Unable to discard draft.';
            if (res?.success === true) {
              AppAlert.alert('Draft Discarded', String(apiMessage), [{
                text: 'OK',
                onPress: () => {
                  setStep('list'); setShowList(false); resetAllFields(); setIsDelete(false);
                  void fetchBrowseData();
                },
              }]);
            } else {
              AppAlert.alert('Discard Failed', String(apiMessage), [{ text: 'OK', onPress: () => setIsDelete(false) }]);
            }
          } catch (e: any) {
            const m = e?.response?.data?.response?.message || e?.response?.data?.message || e?.message || 'Unable to discard draft.';
            AppAlert.alert('Discard Failed', String(m), [{ text: 'OK', onPress: () => setIsDelete(false) }]);
          }
        },
      },
    ]);
  };

  const busy = isLoading || isSaving || isDelete;
  const overlay = busy ? (
    <View style={s.busy} pointerEvents="auto"><ActivityIndicator size="large" color={T.copper} /></View>
  ) : null;

  /* ============================== RENDER ============================== */

  const prpSheet = (id: 'prp' | 'cprp', onPick: (x: any) => void) => (
    <PickerSheet<any>
      key={`${id}-${properties.length}`}
      visible={sheet === id}
      title="Select Property"
      placeholder="Search property"
      remote={false}
      onClose={() => setSheet(null)}
      load={async () => properties}
      keyOf={(x, i) => `${x.PrpCode}-${i}`}
      render={(x) => ({ title: str(x.LngName), sub: str(x.PrpCode) })}
      onPick={onPick}
      emptyText="No properties available"
    />
  );

  if (step === 'creel') {
    const stkName = selectedStock?.stktypename;
    const shiftObj = shifts.find((x) => x.ShfCode === shift);
    return (
      <View style={{ flex: 1 }}>
        <ViewShell
          title="Create New Creel"
          subtitle="Creel details for production"
          onBack={() => { setStep('list'); resetAllFields(); }}
          maxWidth={760}
          footer={
            <View style={s.footer}>
              <View style={[s.footerInner, { maxWidth: 760 }]}>
                <Btn title="Close" variant="secondary" onPress={() => { setStep('list'); resetAllFields(); }} style={{ flex: 1 }} />
                <Btn title="Save & Next" icon="arrow-forward" variant="accent" onPress={saveAndNext} loading={isSaving} style={{ flex: 2 }} />
              </View>
            </View>
          }
        >
          <Card title="Creel">
            <SelectBox label="Property" required value={form.LngName || null} placeholder="Choose property..." onPress={() => setSheet('cprp')} icon="expand-more" />
            <SelectBox
              label="Machine" required
              value={selectedMachine ? str(selectedMachine.MacName) : null}
              sub={selectedMachine ? `Code ${str(selectedMachine.MacCode)}` : null}
              placeholder={machines.length ? 'Select Machine' : 'No machine loaded'}
              onPress={() => setSheet('mac')}
            />
            <Field label="Creel ID" required value={creelId} editable={false} placeholder="Select machine to get Creel ID" big />
            <View style={s.row2}>
              <View style={s.col}><DateField label="Setup Date" required value={setupDate} onChange={setSetupDate} minToday={false} /></View>
              <View style={s.col}>
                <SelectBox
                  label="Shift" required
                  value={shiftObj ? `${str(shiftObj.ShfName)}` : shift || null}
                  sub={shiftObj ? str(shiftObj.ShfCode) : null}
                  placeholder="Choose shift..."
                  onPress={() => setSheet('shift')}
                  icon="expand-more"
                  onClear={shift ? () => setShift('') : undefined}
                />
              </View>
            </View>
            <SelectBox label="Stock Type" required value={stkName || null} sub={selectedStock ? selectedStock.StkType : null} placeholder="Select Stock Type" onPress={() => setSheet('stk')} icon="expand-more" />
            <Field label="Remark" value={remark} onChangeText={setRemark} placeholder="Enter remark" />
          </Card>
          <Banner tone="info" icon="info-outline" text={`Year ${form.YearName || yearOf()} · Setup date must be inside the financial year.`} />
        </ViewShell>

        {prpSheet('cprp', (item) => {
          patchForm({ PrpCode: item.PrpCode, LngName: str(item.LngName) });
          setSheet(null);
          loadMachineShift(item.PrpCode);
        })}
        <PickerSheet<any>
          key={`mac-${machines.length}`}
          visible={sheet === 'mac'}
          title="Select Machine"
          placeholder="Search machine"
          remote={false}
          onClose={() => setSheet(null)}
          load={async () => machines}
          keyOf={(x, i) => `${x.MacCode}-${i}`}
          render={(x) => ({ title: str(x.MacName), sub: `Code ${str(x.MacCode)}` })}
          onPick={pickMachine}
          emptyText="No machine found"
        />
        <PickerSheet<any>
          key={`shift-${shifts.length}`}
          visible={sheet === 'shift'}
          title="Select Shift"
          placeholder="Search shift"
          remote={false}
          onClose={() => setSheet(null)}
          load={async () => shifts}
          keyOf={(x, i) => `${x.ShfCode}-${i}`}
          render={(x) => ({ title: str(x.ShfName), sub: str(x.ShfCode) })}
          onPick={(x) => { setShift(x.ShfCode); setSheet(null); }}
          emptyText="No shift found"
        />
        <PickerSheet<any>
          visible={sheet === 'stk'}
          title="Select Stock Type"
          placeholder="Search"
          remote={false}
          onClose={() => setSheet(null)}
          load={async () => STOCK_TYPES}
          keyOf={(x) => x.StkType}
          render={(x) => ({ title: x.stktypename, sub: x.StkType })}
          onPick={(x) => { setSelectedStock(x); patchForm({ StkType: x.StkType }); setSheet(null); }}
        />
        {overlay}
      </View>
    );
  }

  if (step === 'scan') {
    const totalQty = cartons.reduce((sum, it) => sum + Number(it.qty || 0), 0);
    const draft = sessionStatus === 'DRAFT';
    return (
      <View style={{ flex: 1 }}>
        <ViewShell
          title="Issue Yarn"
          subtitle={`Creel ${creelId || '-'} · Scan carton or search manually`}
          onBack={backToList}
          maxWidth={1000}
          right={sessionStatus ? <Pill label={sessionStatus} fg={draft ? T.amber : T.green} bg={draft ? `${T.amber}1A` : `${T.green}1A`} /> : null}
          footer={
            <View style={s.footer}>
              <View style={[s.footerInner, { maxWidth: 1000 }]}>
                {!showList ? (
                  <>
                    <Btn title="Close" icon="close" variant="secondary" onPress={() => setStep('creel')} style={{ flex: 1 }} />
                    <Btn title="Submit" icon="check-circle" variant="accent" onPress={handleAddCarton} style={{ flex: 1 }} />
                  </>
                ) : (
                  <>
                    <Btn title="Add More" icon="add" variant="secondary" onPress={() => setShowList(false)} style={{ flex: 1 }} />
                    {draft && <Btn title="Discard" icon="delete-outline" variant="danger" onPress={discardDraftSession} disabled={isDelete || isSaving} style={{ flex: 1 }} />}
                    <Btn
                      title={sessionStatus === 'FINAL' ? 'Final' : 'Submit All'}
                      icon={sessionStatus === 'FINAL' ? 'check' : 'send'}
                      variant="accent"
                      onPress={handleFinalSubmit}
                      disabled={!draft || isSaving || isDelete}
                      style={{ flex: 1 }}
                    />
                  </>
                )}
              </View>
            </View>
          }
        >
          <View style={s.tabs}>
            <TouchableOpacity onPress={() => setShowList(false)} style={[s.tab, !showList && s.tabOn]}>
              <Text style={[s.tabText, !showList && { color: '#fff' }]}>Add Carton</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowList(true)} style={[s.tab, showList && s.tabOn]}>
              <Text style={[s.tabText, showList && { color: '#fff' }]}>Cartons ({cartons.length})</Text>
            </TouchableOpacity>
          </View>

          {!showList ? (
            <View style={[wide && s.wideRow2]}>
              <View style={[wide && { flex: 1 }]}>
                <Card title="Find carton">
                  <View style={s.row2}>
                    <Btn title="Scan Carton" icon="qr-code-scanner" onPress={() => setScanOpen(true)} style={{ flex: 1 }} />
                    <Btn title="Manual Search" icon="search" variant="secondary" onPress={() => setSearchOpen(true)} style={{ flex: 1 }} />
                  </View>
                  {Platform.OS === 'web' && <Text style={[s.muted, { marginTop: 8 }]}>On web, use Manual Search if the camera is not available.</Text>}
                </Card>
                {sessionStatus === 'FINAL' && <Banner tone="success" icon="verified" text="This creel is FINAL and cannot accept more cartons." />}
              </View>
              <View style={[wide && { flex: 1 }]}>
                <Card title="Carton details">
                  <KV k="Carton Number" v={cartonNo || '—'} strong />
                  <View style={[s.row2, { marginTop: 8 }]}>
                    <View style={s.col}>
                      <Field label={`Chees${scanned?.Chees !== undefined ? ` (avail ${str(scanned.Chees) || 0})` : ''}`} value={chees} onChangeText={setChees} keyboardType="numeric" placeholder="0" big />
                    </View>
                    <View style={s.col}>
                      <Field label={`Quantity${scanned?.Wt !== undefined ? ` (avail ${str(scanned.Wt) || 0})` : ''}`} value={avgwt} onChangeText={setAvgwt} keyboardType="decimal-pad" placeholder="0.000" big />
                    </View>
                  </View>
                  <KV k="Item" v={str(scanned?.ItmName) || '-'} />
                  <KV k="Merge" v={str(scanned?.MerName) || '-'} />
                  <KV k="Shade" v={str(scanned?.ShdName) || '-'} />
                  <KV k="Grade" v={str(scanned?.GrdName) || '-'} last />
                </Card>
              </View>
            </View>
          ) : (
            <>
              <View style={s.sumBar}>
                <View style={{ flex: 1 }}><Text style={s.sumLbl}>ITEMS</Text><Text style={s.sumVal}>{cartons.length}</Text></View>
                <View style={{ flex: 1 }}><Text style={s.sumLbl}>TOTAL QTY</Text><Text style={s.sumVal}>{totalQty.toFixed(3)}</Text></View>
              </View>
              {cartons.length === 0 ? (
                <EmptyState icon="inventory-2" title="No cartons yet" subtitle="Scan or search the first carton" />
              ) : (
                <View style={[wide && s.grid]}>
                  {cartons.map((c, i) => (
                    <View key={`${str(c.optimisticKey || c.cartonNo)}-${i}`} style={[s.cRow, wide && s.gridItem, c.isPending && { opacity: 0.65 }]}>
                      <Text style={s.cIdx}>{i + 1}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.cNo}>{str(c.cartonNo)}</Text>
                        <Text style={s.cSub} numberOfLines={2}>{str(c.ItmName)}/{str(c.MerName)}</Text>
                        <Text style={s.cSub} numberOfLines={1}>{str(c.ShdName)} / {str(c.GrdName)}</Text>
                        {c.isPending && <Text style={[s.cSub, { color: T.amber }]}>Saving…</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={s.cQty}>Qty {str(c.qty)}</Text>
                        <Text style={s.cSub}>Chees {str(c.chees)}</Text>
                      </View>
                      {draft && (
                        <TouchableOpacity onPress={() => confirmCartonDelete(c, i)} style={s.cDel} hitSlop={HIT} disabled={isDelete || !!c.isPending}>
                          <Icon name="delete-outline" size={18} color={T.red} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          <ScannerModal visible={scanOpen} onClose={() => setScanOpen(false)} onScan={onScan} />
          <CartonSearchSheet
            visible={searchOpen}
            onClose={() => setSearchOpen(false)}
            search={(t) => api.searchCarton({ prpcode: formRef.current.PrpCode, yearno: yearOf(), searchcarton: t })}
            onPick={onManualPick}
          />
        </ViewShell>
        {overlay}
      </View>
    );
  }

  /* ------------------------------ list ------------------------------ */
  const cols = xwide ? 3 : wide ? 2 : 1;
  const filterCard = (
    <Card title="Filter Records" right={<TouchableOpacity onPress={resetFilters} hitSlop={HIT}><Text style={s.reset}>Reset</Text></TouchableOpacity>}>
      <SelectBox label="Property" value={form.LngName || null} placeholder="Choose property..." onPress={() => setSheet('prp')} icon="expand-more" />
      <SelectBox label="Year" value={form.YearName || form.YearNo || null} placeholder="Choose year..." onPress={() => setSheet('year')} icon="expand-more" disabled={!form.PrpCode} />
      <View style={s.row2}>
        <View style={s.col}><DateField label="From Date" value={isoToDmy(form.fromdate)} onChange={(v) => patchForm({ fromdate: toIso(v) })} minToday={false} /></View>
        <View style={s.col}><DateField label="To Date" value={isoToDmy(form.todate)} onChange={(v) => patchForm({ todate: toIso(v) })} minToday={false} /></View>
      </View>
      <View style={[s.row2, { marginBottom: 12 }]}>
        <Chip label="Pending" on={form.status === 'P'} onPress={() => patchForm({ status: 'P' })} dot={T.amber} />
        <Chip label="Completed" on={form.status === 'C'} onPress={() => patchForm({ status: 'C' })} dot={T.green} />
      </View>
      <Btn title="Apply Filters" icon="refresh" variant="accent" onPress={handleLoadPress} loading={isLoading} />
    </Card>
  );

  const header = (
    <View style={{ gap: 8, marginBottom: 8 }}>
      {!wide && filtersOpen && filterCard}
      <View style={s.searchBox}>
        <Icon name="search" size={17} color={T.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search creel..." placeholderTextColor={T.muted} style={s.searchInput} autoCorrect={false} />
        {!!q && <TouchableOpacity onPress={() => setQ('')} hitSlop={HIT}><Icon name="close" size={16} color={T.muted} /></TouchableOpacity>}
      </View>
      <View style={s.chipLine}>
        <Pill label={form.LngName || 'Select Property'} fg={T.nav} bg={T.alt} icon="business" />
        <Pill label={form.YearName || form.YearNo || 'Select Year'} fg={T.nav} bg={T.alt} icon="event" />
        {(!!form.fromdate || !!form.todate) && <Pill label={`${isoToDmy(form.fromdate) || '…'} – ${isoToDmy(form.todate) || '…'}`} fg={T.nav} bg={T.alt} icon="date-range" />}
        <Pill label={form.status === 'C' ? 'Completed' : 'Pending'} fg="#fff" bg={form.status === 'C' ? T.green : T.amber} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ViewShell
        title="Creel Management System"
        subtitle="Create and manage creel entries for production"
        hideBack
        scroll={false}
        right={!wide ? (
          <TouchableOpacity onPress={() => setFiltersOpen((v) => !v)} style={[s.iconBtn, filtersOpen && { backgroundColor: T.nav }]} hitSlop={HIT}>
            <Icon name="filter-list" size={18} color={filtersOpen ? '#fff' : T.ink} />
          </TouchableOpacity>
        ) : null}
      >
        <View style={[{ flex: 1 }, wide && { flexDirection: 'row' }]}>
          {wide && <ScrollView style={s.side} contentContainerStyle={{ padding: 16, paddingRight: 0 }}>{filterCard}</ScrollView>}
          <View style={{ flex: 1 }}>
            <FlatList
              key={`c${cols}`}
              data={filtered}
              numColumns={cols}
              columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
              keyExtractor={(r, i) => `${str(r.UId)}-${i}`}
              contentContainerStyle={[s.pad, { paddingBottom: 100 }]}
              ListHeaderComponent={header}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchBrowseData({ spinner: false }); }} />}
              ListEmptyComponent={!isLoading ? <EmptyState icon="view-module" title="No Data Found" subtitle="Change filters or create a new creel" /> : null}
              renderItem={({ item }) => {
                const status = getStatusFromQty(item.CreelQty);
                const pend = status === 'Pending';
                const draft = item.SessionStatus === 'DRAFT';
                return (
                  <View style={[s.card, { flex: 1 / cols }, { borderLeftColor: pend ? T.amber : T.green }]}>
                    <View style={s.cardHead}>
                      <Text style={s.no} numberOfLines={1}>Creel ID : {str(item.CreelId)}</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <Pill label={status} fg={pend ? T.amber : T.green} bg={pend ? `${T.amber}1A` : `${T.green}1A`} />
                        {!!item.SessionStatus && <Pill label={str(item.SessionStatus)} fg={draft ? T.amber : T.green} bg={draft ? `${T.amber}1A` : `${T.green}1A`} />}
                      </View>
                    </View>
                    <Text style={s.meta}>Creel Vou No: <Text style={s.mono}>{str(item.IssNo) || '-'}</Text></Text>
                    <Text style={s.meta}>Shift: <Text style={s.mono}>{str(item.Shift) || '-'}</Text></Text>
                    <View style={s.cardFoot}>
                      <View style={s.qtyBox}><Text style={s.sumLblDark}>DATE</Text><Text style={s.qtyVal}>{str(item.IssDate) || '-'}</Text></View>
                      <View style={s.qtyBox}><Text style={s.sumLblDark}>QTY</Text><Text style={s.qtyVal}>{Number(item.CreelQty || 0).toFixed(3)}</Text></View>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity onPress={() => handleViewClick(item)} style={s.actBtn} disabled={!!opening}>
                        {opening === item.UId ? <ActivityIndicator size="small" color={T.blue} /> : <Icon name="edit" size={16} color={T.blue} />}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDelete(item)} style={[s.actBtn, { backgroundColor: `${T.red}10` }]}>
                        <Icon name="delete-outline" size={16} color={T.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        </View>

        <TouchableOpacity style={s.fab} onPress={openNew} activeOpacity={0.85}>
          <Icon name="add" size={22} color="#fff" />
          {wide && <Text style={s.fabText}>New Creel</Text>}
        </TouchableOpacity>

        {prpSheet('prp', pickFilterProperty)}
        <PickerSheet<any>
          key={`yr-${form.PrpCode}-${years.length}`}
          visible={sheet === 'year'}
          title="Select Year"
          placeholder="Search year"
          remote={false}
          onClose={() => setSheet(null)}
          load={async () => years}
          keyOf={(x, i) => `${x.YearNo}-${i}`}
          render={(x) => ({ title: str(x.YearName), sub: `Year no ${str(x.YearNo)}` })}
          onPick={(x) => { patchForm({ YearNo: x?.YearNo || '', YearName: str(x.YearName) }); setSheet(null); }}
          emptyText="No years data available"
        />
      </ViewShell>
      {overlay}
    </View>
  );
}

const s = StyleSheet.create({
  pad: { padding: 12 },
  side: { width: 340, flexGrow: 0 },
  wideRow2: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  row2: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  col: { flex: 1, minWidth: 140 },
  muted: { fontSize: 12.5, fontWeight: '600', color: T.muted },
  mono: { fontFamily: MONO, color: T.ink, fontWeight: '900' },
  reset: { color: T.red, fontSize: 12.5, fontWeight: '800' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 44, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 11 },
  searchInput: { flex: 1, fontSize: 13.5, color: T.ink, paddingVertical: 0 },
  chipLine: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, padding: 12, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  no: { flex: 1, fontSize: 14.5, fontWeight: '900', color: T.ink },
  meta: { fontSize: 12.5, fontWeight: '700', color: T.muted, marginTop: 3 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  qtyBox: { backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  qtyVal: { fontSize: 13, fontWeight: '900', color: T.ink, fontFamily: MONO },
  actBtn: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: `${T.blue}10` },
  fab: {
    position: 'absolute', right: 18, bottom: 22, minWidth: 54, height: 54, borderRadius: 27, paddingHorizontal: 16,
    backgroundColor: T.copper, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 13.5, fontWeight: '900' },
  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, width: '100%', alignSelf: 'center' },

  tabs: { flexDirection: 'row', gap: 6, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 11, padding: 3, marginBottom: 10 },
  tab: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: T.nav },
  tabText: { fontSize: 12.5, fontWeight: '900', color: T.ink },
  sumBar: { flexDirection: 'row', backgroundColor: T.nav, borderRadius: 12, padding: 12, marginBottom: 10 },
  sumLbl: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 },
  sumLblDark: { fontSize: 9, fontWeight: '900', color: T.muted, letterSpacing: 0.3 },
  sumVal: { fontSize: 18, fontWeight: '900', color: '#fff', fontFamily: MONO },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { flexBasis: '48%', flexGrow: 1 },
  cRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 10, marginBottom: 8 },
  cIdx: { width: 26, height: 26, borderRadius: 13, backgroundColor: T.alt, textAlign: 'center', lineHeight: 26, fontSize: 11.5, fontWeight: '900', color: T.muted, overflow: 'hidden' },
  cNo: { fontSize: 14, fontWeight: '900', color: T.ink, fontFamily: MONO },
  cSub: { fontSize: 11.5, fontWeight: '600', color: T.muted },
  cQty: { fontSize: 13, fontWeight: '900', color: T.copper, fontFamily: MONO },
  cDel: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.red}10` },
  busy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
});
