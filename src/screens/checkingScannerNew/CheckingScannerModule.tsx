// FILE: src/screens/checkingScannerNew/CheckingScannerModule.tsx
// NEW ERP — Checking Scanner. Port of the legacy module rendered by
// app/(tabs)/checking-scanner.tsx → '@/components/CheckingScanner' (ROOT):
//   components/CheckingScanner/index.tsx            (the rendered component)
//   components/CheckingScanner/ScannerFaultsModal.tsx + FaultSelector.tsx (row "Faults")
//   common/useFaults.ts  (imported by index.tsx; only `setFaultsData([])` is used — no calls)
//   (CheckingScanner.tsx = older variant, FaultsModal.tsx = unused → not ported)
//
// Flow (same as legacy):
//   QR Scanner tab
//     Scan QR (JSON {prpcode, beamno, takano, beamuid, UId, yearno, isfirsttaka, islasttaka, ...})
//       → reset fields, Beam / Taka from QR, then in parallel:
//         get_criterion grd / prodrepackchkby / shift (txntype beam_checking_tablet, yearno = 'yno'),
//         get_criterion operator (txntype chekingScanner), POST get_auto_checking_help → design list.
//       Invalid JSON → "Invalid QR / QR format not valid".
//     Checker default: cached 'qr_checker' → response.user_id → none.
//     Design pick → POST get_auto_checking_help (+dsncode) → Designdata, WarpLen.
//     Meter (≤3 int / 3 dec) → Kgs = Meter × QltWt, AvgWt = Kgs×100/Meter; Kgs edit → AvgWt.
//     Save: validations (beam, taka, design, meter>0, meter ≤ WarpLen, kgs>0, grade, checker,
//       shift, Designdata) → POST add_auto_checking_detail (EMode 'S', SrNo '0',
//       islasttaka = checkbox, IsLastTaka/IsFirstTaka from QR, ismending, OprCode '', d2 []).
//       Success → cache checker ('qr_checker'), saved sticker = data.main[0], load printers.
//   Manual Entry tab (opening it: reset scan fields + GET get_manual_checking_detail →
//     values = new_main[0] → POST get_auto_checking_design_help + 4× get_criterion (manual_checking,
//     prpcode '') ; also POST get_auto_checking_help beam help (unique BeamNo list)).
//     Beam pick → copies beam fields, POST get_auto_checking_help (maxtakano → TakaNo, data[0],
//       design list) + get_criterion shift (beam PrpCode).
//     Design pick → POST get_auto_checking_help (+dsncode) → QltWt / WarpLen / UId / order / plan.
//     Checker pick → cached in 'manual_checker'. Meter → Kgs / AvgWt from QltWt.
//     Save: validateForm (same messages) → POST add_auto_checking_detail (EMode 'M', yearno FY,
//       d2 []) → "Data Saved Successfully ✅" → OK: clear (checker kept), beam help, manual detail.
//     Clear: keeps ChkCode/ChkName, resets form, reloads beam help.
//   Scanner List (EMode 'S' from scan tab, 'M' from manual tab): GET show_beam_checking,
//     local search (design / beam / taka / order design / grade), per row:
//       Print  → printer sheet → POST PRINTSTICKER (PrintFormat 4) with the row
//       Delete (disabled when islasttakatrack = 1) → confirm → POST delete_checking_detail →
//              GET show_checking_fault + POST add_checking_fault (all Remarks blanked) → reload list
//       Remove Last Taka (islasttaka = 1) → confirm → POST add_checking_detail (islasttaka '0',
//              islasttakatrack '1', isalldata / rlasttaka) → reload list (EMode 'S')
//       Faults → FaultsSheet (get_checking_fault_help / add_checking_fault)
//   Printers: GET {API}/api/printers; default = 'lastSelectedPrinter' → IsDefault → first.
//   Pull to refresh: manual detail + beam help (both tabs, as legacy).
//
// Endpoints (see checkingScannerApi.ts): GET get_criterion, POST get_auto_checking_help,
//   POST get_auto_checking_design_help, POST add_auto_checking_detail, GET get_manual_checking_detail,
//   GET show_beam_checking, POST delete_checking_detail, GET show_checking_fault,
//   POST add_checking_fault, GET get_checking_fault_help, POST add_checking_detail,
//   GET {API}/api/printers, POST PRINTSTICKER.
//
// Differences vs legacy:
//   - UI only: NEW ERP look; dropdowns → search sheets; shift picker → chips; QR camera opens
//     in a modal (like WeftIssue); delete confirmation uses AppAlert with the same text;
//     snackbar messages (showSuccess/showError) are shown with AppAlert (same text).
//   - Auto-selecting the default printer after loading no longer closes the printer sheet
//     (legacy closed it before the user could press "Print on …").
//   - Scanner-list search converts values with String() (legacy crashed on numeric fields).
//   - The fault save/remove error snackbar is an AppAlert.
//   - Camera permission is only asked for / required inside the QR camera modal (legacy asked on
//     mount and blocked the whole screen, incl. Manual Entry, until it was granted).
//   Kept as legacy on purpose: the list reload after delete / faults save always uses EMode 'S'
//   (legacy handleScannerList() default); "Clear" / post-save beam help sends the values the
//   form had before clearing; the unused operator lists are still fetched (operator field is
//   commented out in legacy, OprCode is sent as '' / from the manual detail row).
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, BackHandler, FlatList, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Banner, Btn, Card, EmptyState, Field, HIT, KV, Loader, MONO, PickerSheet, Pill, SelectBox, useWide, ViewShell } from '../inquiry/ui';
import {
  createCheckingScannerApi, faultRowParams, getCurrentFinancialYear, LAST_PRINTER_KEY, MANUAL_CHECKER_KEY, Printer,
  QR_CHECKER_KEY, storage, str, TXN_FAULT, TXN_LIST, TXN_MANUAL, TXN_SCAN, TXN_TABLET,
} from './checkingScannerApi';
import { FaultsSheet } from './FaultsSheet';
import { PrinterSheet } from './PrinterSheet';

type Props = { token: string; API: string; username?: string };
type Pick_ = null | 'design' | 'grade' | 'checker' | 'beam' | 'mdesign' | 'mgrade' | 'mchecker';

const METER_RE = /^\d{0,3}(?:\.\d{0,3})?$/;
const errMsg = (e: any, fb: string) => e?.response?.data?.message || e?.response?.data?.error || e?.message || fb;
const listOk = (r: any) => (r?.success && Array.isArray(r?.response?.data) && r.response.data.length > 0 ? r.response.data : null);

export default function CheckingScannerModule({ token, API }: Props) {
  const api = useMemo(() => createCheckingScannerApi(API, token), [API, token]);
  const { wide } = useWide();

  const [showManual, setShowManual] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [pick, setPick] = useState<Pick_>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [manualSaveLoading, setManualSaveLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ---- scan state
  const [scannedValue, setScannedValue] = useState('');
  const [scannedObj, setScannedObj] = useState<any>({});
  const [beamNo, setBeamNo] = useState('');
  const [takaNo, setTakaNo] = useState('');
  const [designs, setDesigns] = useState<any[]>([]); // getData
  const [designData, setDesignData] = useState<any[]>([]); // Designdata
  const [design, setDesign] = useState('');
  const [selectedDesign, setSelectedDesign] = useState<any>(null); // shared by both tabs (legacy)
  const [warpLen, setWarpLen] = useState('0');
  const [grades, setGrades] = useState<any[]>([]);
  const [checkers, setCheckers] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [, setOperators] = useState<any[]>([]);
  const [grade, setGrade] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<any>(null);
  const [checker, setChecker] = useState('');
  const [selectedChecker, setSelectedChecker] = useState<any>(null);
  const [shift, setShift] = useState('');
  const [isLastTaka, setIsLastTaka] = useState(false);
  const [dataSaved, setDataSaved] = useState(false);
  const [savedData, setSavedData] = useState<any>({});

  // ---- shared by both tabs (legacy shares these states)
  const [meter, setMeter] = useState('');
  const [kgs, setKgs] = useState('');
  const [avgWt, setAvgWt] = useState('0');
  const [isMending, setIsMending] = useState(false);

  // ---- manual state (legacy FormState.values)
  const [fv, setFv] = useState<Record<string, any>>({});
  const handleChange = (key: string, value: any) => setFv((p) => ({ ...p, [key]: value }));
  const [manualBeams, setManualBeams] = useState<any[]>([]);
  const [selectedBeam, setSelectedBeam] = useState<any>(null);
  const [manualDesigns, setManualDesigns] = useState<any[]>([]); // getdesigndata
  const [manualGrades, setManualGrades] = useState<any[]>([]);
  const [manualCheckers, setManualCheckers] = useState<any[]>([]);
  const [manualShifts, setManualShifts] = useState<any[]>([]);
  const [, setManualOperators] = useState<any[]>([]);
  const [manualShift, setManualShift] = useState('');
  const [selectedManualGrade, setSelectedManualGrade] = useState<any>(null);
  const [selectedManualChecker, setSelectedManualChecker] = useState<any>(null);

  // ---- printers
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printer, setPrinter] = useState('');
  const [printerLoading, setPrinterLoading] = useState(false);
  const [printerError, setPrinterError] = useState('');
  const [printerOpen, setPrinterOpen] = useState(false);
  const [pendingPrintItem, setPendingPrintItem] = useState<any>(null);
  const [printing, setPrinting] = useState(false);

  // ---- scanner list
  const [listMode, setListMode] = useState<'S' | 'M'>('S');
  const [rows, setRows] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [faultRow, setFaultRow] = useState<any>(null);

  const prptype = () => storage.get('user_prptype');
  const yno = () => storage.get('yno');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!listOpen) return false;
      setListOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [listOpen]);

  /* ------------------------------------------------------------------------ */
  /*  QR scanner tab                                                            */
  /* ------------------------------------------------------------------------ */

  const resetScanFields = () => {
    setDesign(''); setGrade(''); setChecker('');
    setGrades([]); setCheckers([]);
    setSelectedDesign(null); setSelectedGrade(null); setSelectedChecker(null);
    setMeter(''); setKgs(''); setAvgWt(''); setWarpLen('0');
    setDesigns([]); setDesignData([]);
    setBeamNo(''); setTakaNo(''); setScannedObj({}); setShift('');
    setIsLastTaka(false); setPrinter(''); setPrinters([]);
    setDataSaved(false); setSavedData({});
  };

  const getGrades = async (qr: any) => {
    try {
      const r = await api.criterion({ txntype: TXN_TABLET, referrer: 'dashboard', fetch: 'grd', prpcode: qr.prpcode, yearno: await yno() });
      setGrades(listOk(r) || []);
    } catch (e) { console.log('grade API error:', e); }
  };

  const getCheckers = async (qr: any) => {
    try {
      const r = await api.criterion({ txntype: TXN_TABLET, referrer: 'dashboard', fetch: 'prodrepackchkby', prpcode: qr.prpcode, yearno: await yno() });
      const list = listOk(r);
      if (!list) { setCheckers([]); return; }
      setCheckers(list);
      const cache = await storage.get(QR_CHECKER_KEY);
      if (cache) {
        const last = JSON.parse(cache);
        const m = list.find((x: any) => String(x.EmpCode) === String(last.EmpCode));
        if (m) { setSelectedChecker(m); setChecker(m.EmpCode); return; }
      }
      const userId = r.response.user_id;
      if (userId && userId !== '' && userId !== '0') {
        const m = list.find((x: any) => String(x.EmpCode) === String(userId));
        if (m) { setSelectedChecker(m); setChecker(m.EmpCode); return; }
      }
      setSelectedChecker(null);
      setChecker('');
    } catch (e) { console.log('API getCheckers error:', e); }
  };

  const getShifts = async (qr: any) => {
    try {
      const y = await yno();
      const r = await api.criterion({ txntype: TXN_TABLET, referrer: 'dashboard', fetch: 'shift', prpcode: qr.prpcode, yearno: y, prptype: await prptype() });
      setShifts(listOk(r) || []);
    } catch (e) { console.log('API getshifts error:', e); }
  };

  const getOperator = async (qr: any) => {
    const pt = await prptype();
    try {
      const r = await api.criterion({ txntype: TXN_SCAN, fetch: 'operator', prpcode: qr.prpcode, yearno: await yno(), prptype: pt });
      const list = listOk(r);
      setOperators(list ? list.map((x: any) => ({ ...x, OprCode: x.EmpCode, OprName: x.EmpName })) : []);
    } catch (e) { console.log('API getoperator error:', e); }
  };

  const sendScannedValue = async (qrValue: string) => {
    setIsLoading(true);
    try {
      const temp = JSON.parse(qrValue);
      const r = await api.autoCheckingHelp({ txntype: TXN_SCAN, referrer: 'dashboard', scannedString: temp, prpcode: temp.prpcode, yearno: getCurrentFinancialYear() });
      if (r?.success && r?.response?.design) setDesigns(r.response.design);
      else AppAlert.alert('Error', `${r?.message || 'Unexpected response'}`);
    } catch (e) {
      console.log('API sendScannedValue error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const sendScannedValue1 = async (qrValue: string, dsncode: string) => {
    setIsLoading(true);
    try {
      const temp = JSON.parse(qrValue);
      const r = await api.autoCheckingHelp({ txntype: TXN_SCAN, referrer: 'dashboard', scannedString: temp, prpcode: temp.prpcode, dsncode, yearno: getCurrentFinancialYear() });
      const arr = r?.response?.data || [];
      if (r?.success) {
        if (arr.length > 0) { setDesignData(arr); setWarpLen(arr[0].WarpLen || '0'); }
        else { setDesignData([]); setWarpLen('0'); AppAlert.alert('No Data Found'); }
      } else AppAlert.alert('Error', `${r?.message || 'Unexpected response'}`);
    } catch (e) {
      console.log('API sendScannedValue1 error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const onScan = (value: string) => {
    resetScanFields();
    setScannedValue('');
    setScannedValue(value);
    try {
      const parsed = JSON.parse(value);
      setScannedObj(parsed);
      setBeamNo(parsed.beamno || '');
      setTakaNo(parsed.takano || '');
      void getGrades(parsed);
      void getCheckers(parsed);
      void getShifts(parsed);
      void getOperator(parsed);
      void sendScannedValue(value);
    } catch {
      resetScanFields();
      AppAlert.alert('Invalid QR', 'QR format not valid');
    }
    setScanOpen(false);
  };

  const handleMeterChange = (raw: string) => {
    const value = raw.replace(',', '.');
    if (value === '' || METER_RE.test(value)) {
      setMeter(value);
      const qty = value === '' ? 0 : parseFloat(value);
      const qltWt = designData.length > 0 && designData[0].QltWt ? parseFloat(designData[0].QltWt) : 0;
      const wt = qty > 0 && qltWt > 0 ? (qty * qltWt).toFixed(2) : '0.00';
      const avg = qty > 0 && parseFloat(wt) > 0 ? ((parseFloat(wt) * 100) / qty).toFixed(2) : '0.00';
      setKgs(wt);
      setAvgWt(avg);
    }
  };

  const handleKgsChange = (raw: string) => {
    const value = raw.replace(',', '.');
    if (value === '' || METER_RE.test(value)) {
      setKgs(value);
      const qty = parseFloat(meter) || 0;
      const wt = parseFloat(value) || 0;
      setAvgWt(qty === 0 || wt === 0 ? '0.00' : ((wt * 100) / qty).toFixed(2));
    }
  };

  const handleSubmitScan = async () => {
    if (!beamNo) return AppAlert.alert('Beam no can not be blank');
    if (!takaNo) return AppAlert.alert('Taka no can not be blank');
    if (!design) return AppAlert.alert('Design can not be blank.');
    if (!meter || parseFloat(meter) <= 0) return AppAlert.alert('Meter can not be blank or 0.');
    if (parseFloat(meter) > parseFloat(warpLen)) return AppAlert.alert(`Meter ${meter} can not be greater than ${warpLen}.`);
    if (!kgs || parseFloat(kgs) <= 0) return AppAlert.alert('Kgs can not be blank or 0.');
    if (!grade) return AppAlert.alert('Grade can not be blank.');
    if (!checker) return AppAlert.alert('Checker can not be blank.');
    if (!shift) return AppAlert.alert('Shift can not be blank.');
    if (!designData.length) return AppAlert.alert('Design data missing. Select design again.');

    let finalObj: any = {};
    designs.forEach((el: any) => { if (design === el.DsnCode || design === el.dsncode) finalObj = el; });

    setIsLoading(true);
    try {
      const y = await yno();
      const d = designData[0];
      const payload: any = {
        ...finalObj,
        prpcode: scannedObj.prpcode, yearno: y, TakaNo: takaNo, GrdCode: grade, ChkCode: checker,
        Qty: meter, Wt: kgs, AvgWt: avgWt, txntype: TXN_SCAN, ShfCode: shift, SrNo: '0',
        islasttaka: isLastTaka ? 1 : 0,
        isfirsttaka: scannedObj.isfirsttaka,
        IsLastTaka: scannedObj.islasttaka,
        IsFirstTaka: scannedObj.isfirsttaka,
        ismending: isMending ? 1 : 0,
        AuthStatus: d.AuthStatus, BeamNo: d.BeamNo, OrderUId: d.OrderUId, OrderNo: d.OrderNo,
        OrderDsnCode: d.OrderDsnCode, OrderDsnName: d.OrderDsnName, OrderLastDate: d.OrderLastDate,
        UId: d.UId, PlanUId: d.PlanUId, PlanNo: d.PlanNo, BeamUId: d.BeamUId, MacCode: d.MacCode,
        MacName: d.MacName, DsnCode: d.DsnCode, DsnName: d.DsnName, WarpLen: d.WarpLen, QltWt: d.QltWt,
        islasttakatrack: d.islasttakatrack, bstatus: d.bstatus, Status: d.Status, IsAuth: d.IsAuth,
        PrpCode: d.PrpCode, EMode: 'S', OprCode: '', d2: [],
      };
      const r = await api.addAutoCheckingDetail(payload);
      if (r?.success === true) {
        const chk = checkers.find((x: any) => String(x.EmpCode) === String(checker));
        if (chk) await storage.set(QR_CHECKER_KEY, JSON.stringify(chk));
        setDataSaved(true);
        if (r?.data?.main?.[0]) setSavedData(r.data.main[0]);
        void getAllPrinters();
        AppAlert.alert('Success', 'Saved successfully');
      } else {
        setDataSaved(false);
        AppAlert.alert('Error', r?.message || 'Save failed');
      }
    } catch (e) {
      setDataSaved(false);
      console.log('API handleSubmitScan error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*  Printers                                                                  */
  /* ------------------------------------------------------------------------ */

  const selectPrinter = (item: Printer, closeIfIdle: boolean) => {
    const name = item?.Name || '';
    setPrinter(name);
    void storage.set(LAST_PRINTER_KEY, name);
    if (closeIfIdle && !pendingPrintItem) setPrinterOpen(false);
  };

  const getAllPrinters = async () => {
    setPrinterLoading(true);
    setPrinterError('');
    try {
      const list = await api.printers();
      setPrinters(list);
      const last = await storage.get(LAST_PRINTER_KEY);
      const fromStorage = last ? list.find((p) => p.Name === last) : null;
      const def = fromStorage || list.find((p: any) => p.IsDefault || p.isDefault || p.Default) || list[0];
      if (def) selectPrinter(def, false);
      if (list.length === 0) setPrinterError('No printer found from Laravel print bridge.');
    } catch (e: any) {
      const message = errMsg(e, 'Printer service not reachable');
      setPrinterError(message);
      setPrinters([]);
      AppAlert.alert('Printer Error', String(message));
    } finally {
      setPrinterLoading(false);
    }
  };

  const printStickerForData = async (row: any) => {
    const name = printer || '';
    if (!name) return AppAlert.alert('Printer Required', 'Please select printer first.');
    if (!row || Object.keys(row).length === 0) return AppAlert.alert('Print Error', 'Sticker data is empty.');
    setPrinting(true);
    try {
      const res = (await api.print(row, name)) || {};
      if (res.success) {
        AppAlert.alert('Print Successful', `✅ ${res.printed || 1} label(s) sent to printer.`);
        setPrinterOpen(false);
        setPendingPrintItem(null);
      } else AppAlert.alert('Print failed', res.message || 'Print failed');
    } catch (e: any) {
      AppAlert.alert('Print failed', errMsg(e, 'Print failed'));
    } finally {
      setPrinting(false);
    }
  };

  const openPrinterForRow = async (item: any) => {
    setPendingPrintItem(item);
    setPrinterOpen(true);
    if (printers.length === 0) await getAllPrinters();
  };

  /* ------------------------------------------------------------------------ */
  /*  Manual entry tab                                                          */
  /* ------------------------------------------------------------------------ */

  const fetchdesign = async () => {
    const pt = await prptype();
    setManualLoading(true);
    try {
      const r = await api.autoCheckingDesignHelp({
        prptype: pt, yearno: getCurrentFinancialYear(), txntype: TXN_MANUAL, fetch: 'manual_checking_machine_help', referrer: 'dashboard',
      });
      if (r?.success && r?.response?.design) setManualDesigns(r.response.design);
      else AppAlert.alert('No Design Data Found');
    } catch (e) {
      console.log('API error:', e);
    } finally {
      setManualLoading(false);
    }
  };

  /** legacy BeamNoHelp — uses the form values of the caller's render (passed in). */
  const beamNoHelp = async (v: Record<string, any>) => {
    setManualLoading(true);
    try {
      const pt = await prptype();
      const r = await api.autoCheckingHelp({
        txntype: TXN_SCAN,
        referrer: 'dashboard',
        scannedString: {
          prpcode: v.PrpCode || '', prptype: pt || '', beamuid: v.BeamUId || '', beamno: v.BeamNo || '', takano: '',
          isfirsttaka: v.isfirsttaka || '', islasttaka: v.islasttaka || '', yearno: getCurrentFinancialYear(),
        },
        prpcode: v.PrpCode || '',
        prptype: pt || '',
        dsncode: v.DsnCode || '',
        yearno: getCurrentFinancialYear(),
      });
      const data: any[] = Array.isArray(r?.response?.data) ? r.response.data : [];
      setManualBeams(
        data
          .filter((item, i, self) => i === self.findIndex((x) => x.BeamNo === item.BeamNo))
          .map((item) => ({ label: item.BeamNo, value: item.BeamNo, ...item })),
      );
    } catch (e) {
      console.log('BeamNoHelp Error', e);
    } finally {
      setManualLoading(false);
    }
  };

  // legacy: useEffect(() => { if (showManual) BeamNoHelp(); }, [showManual])
  useEffect(() => { if (showManual) void beamNoHelp(fv); }, [showManual]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDesignHelp = async (beam: any) => {
    setManualLoading(true);
    try {
      const pt = await prptype();
      const r = await api.autoCheckingHelp({
        txntype: TXN_SCAN,
        referrer: 'dashboard',
        scannedString: {
          prpcode: beam.PrpCode, prptype: pt, beamuid: beam.BeamUId, beamno: beam.BeamNo, takano: '',
          isfirsttaka: beam.isfirsttaka || 0, islasttaka: beam.islasttaka || 1, yearno: getCurrentFinancialYear(),
        },
        prpcode: beam.PrpCode,
        prptype: pt,
        dsncode: beam.DsnCode || '',
        yearno: getCurrentFinancialYear(),
      });
      const maxTakaNo = r?.response?.maxtakano ?? '';
      setFv((p) => ({ ...p, TakaNo: maxTakaNo }));
      if (r?.success) {
        const row = r?.response?.data?.[0];
        if (row) {
          setFv((p) => ({
            ...p, QltWt: row.QltWt, WarpLen: row.WarpLen, UId: row.UId, AuthStatus: row.AuthStatus, BeamNo: row.BeamNo,
            BeamUId: row.BeamUId, DsnCode: row.DsnCode, DsnName: row.DsnName,
          }));
        }
        const des = r?.response?.design;
        if (Array.isArray(des)) setManualDesigns(des.map((x: any) => ({ ...x, DsnCode: x.DsnCode || x.dsncode, DsnName: x.DsnName || x.dsnname })));
      }
    } catch (e) {
      console.log('Design Help Error', e);
    } finally {
      setManualLoading(false);
    }
  };

  const manualDesignSelect = async (item: any) => {
    const v = fv;
    setManualLoading(true);
    try {
      const pt = await prptype();
      const temp = {
        prpcode: v.PrpCode, prptype: pt, beamuid: v.BeamUId, beamno: v.BeamNo, takano: '',
        isfirsttaka: v.isfirsttaka || 0, islasttaka: v.islasttaka || 1, yearno: getCurrentFinancialYear(),
      };
      const r = await api.autoCheckingHelp({
        txntype: TXN_SCAN, referrer: 'dashboard', scannedString: temp, prpcode: temp.prpcode, dsncode: item?.dsncode || '', yearno: getCurrentFinancialYear(),
      });
      if (r?.success) {
        const d = r?.response?.data?.[0];
        if (d) {
          setFv((p) => ({
            ...p, QltWt: d.QltWt, WarpLen: d.WarpLen, UId: d.UId, AuthStatus: d.AuthStatus, BeamNo: d.BeamNo, BeamUId: d.BeamUId,
            DsnCode: d.DsnCode, DsnName: d.DsnName, OrderNo: d.OrderNo, OrderUId: d.OrderUId, OrderDsnCode: d.OrderDsnCode,
            OrderDsnName: d.OrderDsnName, OrderLastDate: d.OrderLastDate, PlanNo: d.PlanNo, PlanUId: d.PlanUId, Status: d.Status, IsAuth: d.IsAuth,
          }));
        }
      }
    } catch (e) {
      console.log('manualDesignSelect Error', e);
    } finally {
      setManualLoading(false);
    }
  };

  const handleManualMeterChange = (raw: string) => {
    const value = raw.replace(',', '.');
    if (value === '' || METER_RE.test(value)) {
      setMeter(value);
      const qty = value === '' ? 0 : parseFloat(value);
      const qltWt = parseFloat(fv.QltWt || 0);
      const wt = qty > 0 && qltWt > 0 ? (qty * qltWt).toFixed(2) : '0.00';
      const avg = qty > 0 && parseFloat(wt) > 0 ? ((parseFloat(wt) * 100) / qty).toFixed(2) : '0.00';
      setKgs(wt);
      setAvgWt(avg);
      setFv((p) => ({ ...p, Qty: value, Wt: wt, AvgWt: avg }));
    }
  };

  const handleManualKgsChange = (raw: string) => {
    const value = raw.replace(',', '.');
    if (value === '' || METER_RE.test(value)) {
      setKgs(value);
      const qty = parseFloat(meter) || 0;
      const wt = parseFloat(value) || 0;
      const avg = qty === 0 || wt === 0 ? '0.00' : ((wt * 100) / qty).toFixed(2);
      setAvgWt(avg);
      setFv((p) => ({ ...p, Wt: value, AvgWt: avg }));
    }
  };

  const fetchManualLists = async () => {
    try {
      const y = await yno();
      const pt = await prptype();
      const b = { referrer: 'dashboard', prpcode: '', yearno: y, prptype: pt };
      const [g, c, o, sh] = await Promise.all([
        api.criterion({ ...b, txntype: TXN_MANUAL, fetch: 'grd' }),
        api.criterion({ ...b, txntype: TXN_MANUAL, fetch: 'prodrepackchkby' }),
        api.criterion({ ...b, txntype: TXN_MANUAL, fetch: 'operator' }),
        api.criterion({ ...b, txntype: TXN_MANUAL, fetch: 'shift' }),
      ]);
      setManualGrades(listOk(g) || []);
      const cl = listOk(c);
      if (cl) {
        setManualCheckers(cl);
        const cache = await storage.get(MANUAL_CHECKER_KEY);
        if (cache) {
          const last = JSON.parse(cache);
          const m = cl.find((x: any) => String(x.EmpCode) === String(last.EmpCode));
          if (m) { setSelectedManualChecker(m); setFv((p) => ({ ...p, ChkCode: m.EmpCode, ChkName: m.EmpName })); }
        }
      } else setManualCheckers([]);
      setManualShifts(listOk(sh) || []);
      const ol = listOk(o);
      setManualOperators(ol ? ol.map((x: any) => ({ ...x, OprCode: x.EmpCode, OprName: x.EmpName })) : []);
    } catch (e) {
      console.log('fetchManualGradeCheckerOperatorShift error:', e);
    }
  };

  const fetchManualShift = async (prpcode: string) => {
    try {
      const r = await api.criterion({ referrer: 'dashboard', prpcode: prpcode || '', yearno: await yno(), prptype: await prptype(), txntype: TXN_MANUAL, fetch: 'shift' });
      const l = listOk(r);
      if (l) setManualShifts(l); else { setManualShifts([]); setManualShift(''); }
    } catch (e) {
      console.log('fetchManualShift error:', e);
      setManualShifts([]);
      setManualShift('');
    }
  };

  const soshow = async () => {
    const pt = await prptype();
    setManualLoading(true);
    try {
      const r = await api.manualCheckingDetail({ prptype: pt, yearno: getCurrentFinancialYear(), txntype: TXN_MANUAL, MacCode: '', TakaNo: '' });
      const newMain = r?.data?.new_main || [];
      if (r?.success && newMain.length > 0) {
        setFv({ ...newMain[0] });
        void fetchdesign();
        void fetchManualLists();
      } else AppAlert.alert('No Data Found');
    } catch (e) {
      console.log('API error:', e);
    } finally {
      setManualLoading(false);
    }
  };

  const showAlert = (message: string) =>
    new Promise<void>((resolve) => {
      AppAlert.alert('Validation Error', message, [{ text: 'OK', onPress: () => resolve() }], { cancelable: false });
    });

  const validateForm = async () => {
    if (!fv.BeamNo) { await showAlert('Please select Beam No'); return false; }
    if (!fv.TakaNo) { await showAlert('Please Enter TakaNo'); return false; }
    if (!fv.DsnName) { await showAlert('Please Enter Design'); return false; }
    const m = parseFloat(meter);
    if (meter === '' || Number.isNaN(m) || m <= 0) { await showAlert('Please Enter valid Meter'); return false; }
    const k = parseFloat(kgs);
    if (kgs === '' || Number.isNaN(k) || k <= 0) { await showAlert('Please Enter valid Kgs'); return false; }
    if (!fv.GrdCode) { await showAlert('Please select Grade'); return false; }
    if (!fv.ChkCode) { await showAlert('Please select Checker'); return false; }
    if (!fv.ShfCode) { await showAlert('Please select Shift'); return false; }
    return true;
  };

  /** legacy handleClearForm — beam help is re-run with the values held before clearing. */
  const handleClearForm = (prev: Record<string, any>) => {
    setFv({ ChkCode: prev.ChkCode, ChkName: prev.ChkName });
    setSelectedBeam(null);
    setSelectedDesign(null);
    setSelectedManualGrade(null);
    setManualShift('');
    setMeter('');
    setKgs('');
    setAvgWt('0');
    setIsMending(false);
    setManualBeams([]);
    void beamNoHelp(prev);
  };

  const handlesave = async () => {
    const pt = await prptype();
    if (!(await validateForm())) return;
    const v = fv;
    setManualSaveLoading(true);
    try {
      const payload = {
        ...v,
        AvgWt: avgWt,
        prpcode: v.PrpCode,
        isfirsttaka: v.isfirsttaka || '',
        IsFirstTaka: v.isfirsttaka || '',
        islasttaka: v.islasttaka || '',
        IsLastTaka: v.islasttaka || '',
        ismending: isMending ? 1 : 0,
        prptype: pt,
        txntype: TXN_SCAN,
        yearno: getCurrentFinancialYear(),
        EMode: 'M',
        d2: [],
      };
      const r = await api.addAutoCheckingDetail(payload);
      if (r?.success === true) {
        AppAlert.alert('Success', 'Data Saved Successfully ✅', [
          {
            text: 'OK',
            onPress: async () => {
              handleClearForm(v);
              await beamNoHelp(v);
              await soshow();
            },
          },
        ]);
      } else {
        AppAlert.alert('Error', `⚠️ ${r?.message}`);
      }
    } catch (e) {
      console.log('API handlesave error:', e);
    } finally {
      setManualSaveLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*  Scanner list                                                              */
  /* ------------------------------------------------------------------------ */

  const handleScannerList = async (mode: 'S' | 'M' = 'S') => {
    const pt = await prptype();
    setListMode(mode);
    setListOpen(true);
    setListLoading(true);
    try {
      const r = await api.showBeamChecking({
        prptype: pt, yearno: getCurrentFinancialYear(), txntype: TXN_LIST, ShfCode: '', ChkDate: '', PrpCode: '', BeamNo: '', EMode: mode,
      });
      setRows(r?.success ? r?.data?.main || [] : []);
    } catch (e) {
      console.log('API handleScannerList error:', e);
    } finally {
      setListLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const has = (x: any) => x !== null && x !== undefined && String(x).toLowerCase().includes(q);
    return rows.filter((i) => has(i?.DsnName) || has(i?.BeamNo) || has(i?.TakaNo) || has(i?.OrdDsnName) || has(i?.GrdName));
  }, [rows, search]);

  const clearAndSaveFaultsForRow = async (row: any) => {
    try {
      const fr = await api.showCheckingFault(faultRowParams(row));
      const list = fr?.data || fr?.response?.data || [];
      if (!list.length) return;
      await api.addCheckingFault({
        ShfCode: row?.ShfCode || '', ChkDate: row?.ChkDate || '', MacGrp: row?.MacGrp || '', PrpCode: row?.PrpCode || '',
        BeamNo: row?.BeamNo || '', SrNo: row?.SrNo || '', UId: row?.UId || '', yearno: getCurrentFinancialYear(),
        txntype: TXN_FAULT, d1: list.map((i: any) => ({ ...i, Remark: '' })), IsEntry: '1',
      });
    } catch (e) {
      console.log('clearAndSaveFaultsForRow error', e);
    }
  };

  const handledelete = async (item: any) => {
    setIsDeleteLoading(true);
    try {
      const r = await api.deleteCheckingDetail({
        ShfCode: item?.ShfCode || '', ChkDate: item?.ChkDate || '', MacGrp: item?.MacGrp || '', PrpCode: item?.PrpCode || '',
        yearno: item?.yearno || getCurrentFinancialYear(), txntype: TXN_SCAN, SrNo: item?.SrNo || '', UId: item?.UId || '', BeamNo: item?.BeamNo || '',
      });
      if (r?.success) {
        await clearAndSaveFaultsForRow(item);
        AppAlert.alert('Success', r?.message || 'Delete successfully');
        await handleScannerList();
      } else AppAlert.alert('Error', r?.message || 'Delete failed');
    } catch (e) {
      console.log('handledelete error', e);
      AppAlert.alert('Error', 'Something went wrong');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const confirmDelete = (item: any) =>
    AppAlert.alert('Delete Record', 'Are you sure you want to delete this scanner record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void handledelete(item); } },
    ]);

  const removeLastTaka = async (row: any) => {
    try {
      setIsDeleteLoading(true);
      const y = row?.yearno || row?.YearNo || (await yno()) || getCurrentFinancialYear();
      const pad = (n: number) => String(n).padStart(2, '0');
      let chkDate = row?.ChkDate || '';
      if (chkDate) {
        const dt = new Date(chkDate);
        if (!Number.isNaN(dt.getTime())) chkDate = `${pad(dt.getDate())}-${pad(dt.getMonth() + 1)}-${dt.getFullYear()}`;
      } else {
        const now = new Date();
        chkDate = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
      }
      let isalldata = '0';
      let rlasttaka = '0';
      const m = rows.length > 0
        ? rows.find((x: any) => String(x?.SrNo ?? '') === String(row?.SrNo ?? '') && String(x?.UId ?? '') === String(row?.UId ?? ''))
        : null;
      if (m && String(row?.islasttaka ?? '0') !== String(m?.islasttaka ?? '0')) { isalldata = '1'; rlasttaka = '1'; }

      const payload = {
        ShfCode: row?.ShfCode || '', ChkDate: chkDate, MacGrp: row?.MacGrp || '', PrpCode: row?.PrpCode || '', yearno: y, txntype: TXN_SCAN,
        d1: [{
          font: row?.font || '0', MacCode: row?.MacCode || '', MacName: row?.MacName ?? null, TakaNo: row?.TakaNo || '', BeamNo: row?.BeamNo || '',
          DsnCode: row?.DsnCode || '', DsnName: row?.DsnName || '', WarpLen: row?.WarpLen || '0', BalLen: row?.BalLen || '0', CutLen: row?.CutLen || '.000',
          UId: row?.UId || '', SrNo: row?.SrNo || '', BeamUId: row?.BeamUId || '', PlanUId: row?.PlanUId || '0', PlanSrNo: row?.PlanSrNo || '0',
          Status: row?.Status ?? '0', Qty: row?.Qty || '0', Wt: row?.Wt || '0', AvgWt: row?.AvgWt || '0', GrdCode: row?.GrdCode || '',
          GrdName: row?.GrdName || '', Remarks: row?.Remarks || '', ChkCode: row?.ChkCode || '', ChkName: row?.ChkName || '',
          SupCode: row?.SupCode || '', SupName: row?.SupName ?? null, TechSup: row?.TechSup || '', TechSupName: row?.TechSupName ?? null,
          QltWt: row?.QltWt || '0', RecType: row?.RecType || 'O', OQty: row?.OQty || row?.Qty || '0', GStatus: row?.GStatus || '0',
          WvrCode: row?.WvrCode || '', WvrName: row?.WvrName ?? null, ismending: row?.ismending || '0',
          islasttaka: '0', islasttakatrack: '1',
          EMode: row?.EMode || '', PrpCode: row?.PrpCode || '', trantype: row?.trantype || '', shdcode: row?.shdcode || '', shdname: '.',
          kgQty: row?.kgQty || '0', subsr: row?.subsr || '0', LinkedOrderUId: row?.LinkedOrderUId || '0', LinkedOrderNo: row?.LinkedOrderNo || '0',
          OprCode: row?.OprCode || '', OprName: row?.OprName || ' ',
          isalldata, rlasttaka,
        }],
        d2: [],
      };
      const r = await api.addCheckingDetail(payload);
      if (r?.success === true) {
        AppAlert.alert('Success', r?.message || 'Last Taka removed successfully');
        await handleScannerList('S');
      } else AppAlert.alert('Error', r?.message || 'Unable to remove Last Taka');
    } catch (e: any) {
      AppAlert.alert('Error', e?.response?.data?.message || e?.message || 'Something went wrong while removing Last Taka');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const confirmRemoveLastTaka = (row: any) => {
    if (!row) return;
    AppAlert.alert('Remove Last Taka', `Are you sure you want to remove Last Taka from Taka No ${row?.TakaNo || ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Remove', style: 'destructive', onPress: () => { void removeLastTaka(row); } },
    ], { cancelable: false });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await soshow();
    await beamNoHelp(fv);
    setRefreshing(false);
  };

  /* ------------------------------------------------------------------------ */
  /*  Render                                                                    */
  /* ------------------------------------------------------------------------ */

  const shiftChips = (items: any[], value: string, onChange: (v: string) => void) => (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.label}>Shift <Text style={{ color: T.red }}>*</Text></Text>
      {items.length === 0 ? <Text style={s.muted}>No shift available</Text> : (
        <View style={s.chips}>
          {items.map((it, i) => {
            const on = String(value) === String(it.ShfCode) && value !== '';
            return (
              <TouchableOpacity key={`${it.ShfCode}-${i}`} onPress={() => onChange(it.ShfCode)} style={[s.chip, on && s.chipOn]} activeOpacity={0.75}>
                <Text style={[s.chipText, on && { color: '#fff' }]}>{str(it.ShfName)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const lastTakaBox = (on: boolean, onPress: () => void) => (
    <TouchableOpacity onPress={onPress} style={s.checkRow} activeOpacity={0.75}>
      <View style={[s.check, on && { backgroundColor: T.nav, borderColor: T.nav }]}>{on && <Icon name="check" size={15} color="#fff" />}</View>
      <Text style={s.checkText}>Is Last Taka</Text>
    </TouchableOpacity>
  );

  const mendingBox = (onChange: (v: boolean) => void) => (
    <View style={s.mending}>
      <View style={[s.mendIcon, isMending && { backgroundColor: `${T.blue}18` }]}>
        <Icon name="build" size={18} color={isMending ? T.blue : T.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.mendTitle}>Mending Entry</Text>
        <Text style={s.mendSub}>{isMending ? 'This taka requires mending' : 'Normal checking entry'}</Text>
      </View>
      <Switch value={isMending} onValueChange={onChange} trackColor={{ false: T.border, true: `${T.copper}88` }} thumbColor={isMending ? T.copper : '#fff'} />
    </View>
  );

  const measure = (onMeter: (v: string) => void, onKgs: (v: string) => void, meterLabel: string) => (
    <>
      <View style={s.row2}>
        <Field label={meterLabel} required value={meter} onChangeText={onMeter} keyboardType="decimal-pad" placeholder="0.000" style={s.col} big />
        <Field label="Kgs" required value={kgs} onChangeText={onKgs} keyboardType="decimal-pad" placeholder="0.00" style={s.col} big />
      </View>
      <View style={s.avg}>
        <Text style={s.avgK}>AVG. WT</Text>
        <Text style={s.avgV}>{avgWt || '0'}</Text>
      </View>
    </>
  );

  const scanTab = (
    <>
      <View style={s.scanBanner}>
        <View style={s.scanIcon}><Icon name="qr-code-scanner" size={28} color={T.copper} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.scanTitle}>QR Scanner</Text>
          <Text style={s.scanSub}>{beamNo ? `Beam ${beamNo} · Taka ${takaNo}` : 'Point camera to the taka QR code'}</Text>
        </View>
        <Btn title="Scan" icon="photo-camera" variant="accent" onPress={() => { resetScanFields(); setScanOpen(true); }} />
      </View>
      {dataSaved && <Banner tone="success" icon="check-circle" title="Saved" text="Checking entry saved — select a printer to print the sticker." />}
      <View style={[wide && s.wideRow]}>
        <View style={[wide && { flex: 1 }]}>
          <Card title="Fabric Info">
            <View style={s.row2}>
              <Field label="Beam Number" required value={beamNo} editable={false} style={s.col} />
              <Field label="Taka No" required value={takaNo} editable={false} style={s.col} />
            </View>
            <SelectBox
              label="Design" required value={selectedDesign ? str(selectedDesign.dsnname) : ''} sub={selectedDesign ? `Code ${str(selectedDesign.dsncode)}` : null}
              placeholder="Choose design..." onPress={() => setPick('design')} icon="expand-more"
            />
          </Card>
          <Card title="Production Details">
            {measure(handleMeterChange, handleKgsChange, `Meter${parseFloat(warpLen) > 0 ? ` [${warpLen}]` : ''}`)}
          </Card>
        </View>
        <View style={[wide && { flex: 1 }]}>
          <Card title="Quality Details">
            <SelectBox label="Grade" required value={selectedGrade ? str(selectedGrade.GrdName) : ''} sub={selectedGrade ? `Code ${str(selectedGrade.GrdCode)}` : null} placeholder="Choose grade..." onPress={() => setPick('grade')} icon="expand-more" />
            <SelectBox label="Checker" required value={selectedChecker ? str(selectedChecker.EmpName) : ''} sub={selectedChecker ? `Code ${str(selectedChecker.EmpCode)}` : null} placeholder="Choose checker..." onPress={() => setPick('checker')} icon="expand-more" />
            {shiftChips(shifts, shift, setShift)}
            {lastTakaBox(isLastTaka, () => setIsLastTaka(!isLastTaka))}
            {mendingBox(setIsMending)}
          </Card>
          {dataSaved && (
            <Card title="Sticker">
              <View style={s.row2}>
                <Btn
                  title={printer ? `Print (${printer})` : 'Select Printer & Print'} icon="print" variant="secondary" style={s.col}
                  onPress={() => { setPendingPrintItem(null); if (printers.length === 0) void getAllPrinters(); setPrinterOpen(true); }}
                />
                {!!printer && <Btn title="Print Sticker" icon="print" variant="accent" style={s.col} loading={printing} onPress={() => printStickerForData(savedData)} />}
              </View>
            </Card>
          )}
        </View>
      </View>
    </>
  );

  const mShiftOn = manualShift;
  const manualTab = (
    <View style={[wide && s.wideRow]}>
      <View style={[wide && { flex: 1 }]}>
        <Card title="Fabric Info">
          <SelectBox
            label="Beam No" required value={selectedBeam ? str(selectedBeam.BeamNo) : ''} sub={selectedBeam ? `${str(selectedBeam.MacName || selectedBeam.MacCode)}` : null}
            placeholder="Select Beam No" onPress={() => setPick('beam')} icon="expand-more"
          />
          <Field label="Taka No" required value={str(fv.TakaNo)} onChangeText={(t) => handleChange('TakaNo', t)} maxLength={20} />
          <SelectBox
            label="Design" required value={selectedDesign ? str(selectedDesign.dsnname) : ''} sub={selectedDesign ? `Code ${str(selectedDesign.dsncode)}` : null}
            placeholder="Choose Design..." onPress={() => setPick('mdesign')} icon="expand-more"
          />
          {!!fv.BeamNo && (
            <View style={{ marginTop: 2 }}>
              <KV k="Machine" v={str(fv.MacName || fv.MacCode) || '-'} />
              <KV k="Warp Len" v={str(fv.WarpLen) || '-'} />
              <KV k="Qlt Wt" v={str(fv.QltWt) || '-'} last />
            </View>
          )}
        </Card>
        <Card title="Production Details">
          {measure(handleManualMeterChange, handleManualKgsChange, 'Meter')}
        </Card>
      </View>
      <View style={[wide && { flex: 1 }]}>
        <Card title="Quality Details">
          <SelectBox label="Grade" required value={selectedManualGrade ? str(selectedManualGrade.GrdName) : ''} sub={selectedManualGrade ? `Code ${str(selectedManualGrade.GrdCode)}` : null} placeholder="Choose grade..." onPress={() => setPick('mgrade')} icon="expand-more" />
          <SelectBox label="Checker" required value={selectedManualChecker ? str(selectedManualChecker.EmpName) : ''} sub={selectedManualChecker ? `Code ${str(selectedManualChecker.EmpCode)}` : null} placeholder="Choose checker..." onPress={() => setPick('mchecker')} icon="expand-more" />
          {shiftChips(manualShifts, mShiftOn, (val) => { setManualShift(val); handleChange('ShfCode', val); })}
          {lastTakaBox(Number(fv.islasttaka) === 1, () => handleChange('islasttaka', fv.islasttaka ? 0 : 1))}
          {mendingBox((val) => { setIsMending(val); handleChange('ismending', val ? 1 : 0); })}
        </Card>
      </View>
    </View>
  );

  const footer = (
    <View style={s.footer}>
      <View style={[s.footerInner, wide && { maxWidth: 1040 }]}>
        {showManual ? (
          <>
            <Btn title="Clear" variant="secondary" icon="clear" onPress={() => handleClearForm(fv)} />
            <Btn title="Scanner List" variant="secondary" icon="list" onPress={() => handleScannerList('M')} style={{ flex: 1 }} />
            <Btn title="Save" icon="save" variant="accent" onPress={handlesave} loading={manualSaveLoading} style={{ flex: 1.4 }} />
          </>
        ) : (
          <>
            <Btn title="Scanner List" variant="secondary" icon="list" onPress={() => handleScannerList('S')} style={{ flex: 1 }} />
            <Btn title="Save Entry" icon="save" variant="accent" onPress={handleSubmitScan} loading={isLoading} style={{ flex: 1.4 }} />
          </>
        )}
      </View>
    </View>
  );

  const pickCfg: Record<Exclude<Pick_, null>, { title: string; list: any[]; t: (x: any) => string; sub: (x: any) => string; on: (x: any) => void }> = {
    design: {
      title: 'Select Design', list: designs, t: (x) => str(x.dsnname), sub: (x) => `Code ${str(x.dsncode)}`,
      on: (x) => {
        setDesign(x.dsncode); setWarpLen(x.WarpLen || '0');
        setSelectedDesign(x); setDesign(x.dsncode);
        if (scannedValue) void sendScannedValue1(scannedValue, x.dsncode);
      },
    },
    grade: { title: 'Select Grade', list: grades, t: (x) => str(x.GrdName), sub: (x) => `Code ${str(x.GrdCode)}`, on: (x) => { setSelectedGrade(x); setGrade(x.GrdCode); } },
    checker: { title: 'Select Checker', list: checkers, t: (x) => str(x.EmpName), sub: (x) => `Code ${str(x.EmpCode)}`, on: (x) => { setSelectedChecker(x); setChecker(x.EmpCode); } },
    beam: {
      title: 'Select Beam No', list: manualBeams, t: (x) => str(x.BeamNo),
      sub: (x) => [str(x.MacName || x.MacCode), str(x.DsnName), x.WarpLen ? `Warp ${str(x.WarpLen)}` : ''].filter(Boolean).join(' · '),
      on: (item) => {
        setSelectedBeam(item);
        setFv((p) => ({
          ...p, AuthStatus: item.AuthStatus, MacCode: item.MacCode, MacName: item.MacName, PrpCode: item.PrpCode, BeamNo: item.BeamNo,
          BeamUId: item.BeamUId, isfirsttaka: item.isfirsttaka, islasttaka: item.islasttaka, bstatus: item.bstatus, IsAuth: item.IsAuth,
          islasttakatrack: item.islasttakatrack, OrderDsnCode: item.OrderDsnCode, OrderDsnName: item.OrderDsnName, OrderLastDate: item.OrderLastDate,
          OrderNo: item.OrderNo, OrderUId: item.OrderUId, PlanNo: item.PlanNo, PlanUId: item.PlanUId, QltWt: item.QltWt, Status: item.Status,
          WarpLen: item.WarpLen, UId: item.UId,
        }));
        void fetchDesignHelp(item);
        void fetchManualShift(item.PrpCode);
      },
    },
    mdesign: {
      title: 'Select Design', list: manualDesigns, t: (x) => str(x.dsnname), sub: (x) => `Code ${str(x.dsncode)}`,
      on: (x) => { setSelectedDesign(x); setFv((p) => ({ ...p, DsnCode: x.dsncode, DsnName: x.dsnname })); void manualDesignSelect(x); },
    },
    mgrade: {
      title: 'Select Grade', list: manualGrades, t: (x) => str(x.GrdName), sub: (x) => `Code ${str(x.GrdCode)}`,
      on: (x) => { setSelectedManualGrade(x); setFv((p) => ({ ...p, GrdCode: x.GrdCode, GrdName: x.GrdName })); },
    },
    mchecker: {
      title: 'Select Checker', list: manualCheckers, t: (x) => str(x.EmpName), sub: (x) => `Code ${str(x.EmpCode)}`,
      on: (x) => { setSelectedManualChecker(x); setFv((p) => ({ ...p, ChkCode: x.EmpCode, ChkName: x.EmpName })); void storage.set(MANUAL_CHECKER_KEY, JSON.stringify(x)); },
    },
  };
  const cfg = pick ? pickCfg[pick] : null;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={[{ flex: 1 }, listOpen && { display: 'none' }]}>
        <ViewShell title="Checking Scanner" subtitle="Scan with QR code or enter manually" hideBack scroll={false} footer={footer} maxWidth={1040}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[s.body, wide && { paddingHorizontal: 20 }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.copper]} tintColor={T.copper} />}
          >
            <View style={s.tabs}>
              <TouchableOpacity
                style={[s.tab, showManual && s.tabOn]}
                onPress={() => { resetScanFields(); setShowManual(true); setScanOpen(false); void soshow(); }}
                activeOpacity={0.8}
              >
                <Icon name="edit" size={18} color={showManual ? '#fff' : T.ink} />
                <Text style={[s.tabText, showManual && { color: '#fff' }]}>Manual Entry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tab, !showManual && s.tabOn]} onPress={() => setShowManual(false)} activeOpacity={0.8}>
                <Icon name="qr-code-scanner" size={18} color={!showManual ? '#fff' : T.ink} />
                <Text style={[s.tabText, !showManual && { color: '#fff' }]}>QR Scanner</Text>
              </TouchableOpacity>
            </View>
            {showManual ? manualTab : scanTab}
          </ScrollView>
        </ViewShell>
      </View>

      {listOpen && (
        <ScannerList
          mode={listMode}
          rows={filtered}
          loading={listLoading}
          search={search}
          setSearch={setSearch}
          busy={isDeleteLoading}
          onBack={() => setListOpen(false)}
          onPrint={(r) => { void openPrinterForRow(r); }}
          onDelete={confirmDelete}
          onRemoveLast={confirmRemoveLastTaka}
          onFaults={setFaultRow}
        />
      )}

      {(isLoading || manualLoading) && !scanOpen && (
        <View style={s.overlay} pointerEvents="auto"><ActivityIndicator size="large" color="#fff" /></View>
      )}
      {isDeleteLoading && (
        <View style={s.overlay}>
          <View style={s.delBox}>
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={s.delText}>Deleting record...</Text>
          </View>
        </View>
      )}

      {cfg && (
        <PickerSheet<any>
          visible
          title={cfg.title}
          placeholder="Search…"
          remote={false}
          onClose={() => setPick(null)}
          load={async () => cfg.list}
          keyOf={(x, i) => `${cfg.t(x)}-${i}`}
          render={(x) => ({ title: cfg.t(x) || '-', sub: cfg.sub(x) })}
          onPick={(x) => { cfg.on(x); setPick(null); }}
          emptyText="No items"
        />
      )}

      <PrinterSheet
        visible={printerOpen}
        subtitle={pendingPrintItem ? `Beam ${str(pendingPrintItem.BeamNo)} · Taka ${str(pendingPrintItem.TakaNo)}` : ''}
        printers={printers}
        printer={printer}
        loading={printerLoading}
        error={printerError}
        pending={!!pendingPrintItem}
        printing={printing}
        onSelect={(p) => selectPrinter(p, true)}
        onReload={() => { void getAllPrinters(); }}
        onClose={() => { setPrinterOpen(false); setPendingPrintItem(null); }}
        onPrint={() => printStickerForData(pendingPrintItem)}
      />

      <FaultsSheet api={api} visible={!!faultRow} row={faultRow} onClose={() => setFaultRow(null)} onSaved={() => { void handleScannerList(); }} />

      <ScannerModal visible={scanOpen} onClose={() => setScanOpen(false)} onScan={onScan} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scanner list view                                                          */
/* -------------------------------------------------------------------------- */

function ScannerList(p: {
  mode: 'S' | 'M'; rows: any[]; loading: boolean; search: string; setSearch: (v: string) => void; busy: boolean;
  onBack: () => void; onPrint: (r: any) => void; onDelete: (r: any) => void; onRemoveLast: (r: any) => void; onFaults: (r: any) => void;
}) {
  const { wide, xwide } = useWide();
  const cols = xwide ? 3 : wide ? 2 : 1;
  return (
    <ViewShell title="Scanner List" subtitle={`${p.rows.length} items · ${p.mode === 'M' ? 'Manual' : 'QR scanner'} entries`} onBack={p.onBack} scroll={false} maxWidth={1200}>
      <View style={{ flex: 1 }}>
        <View style={[s.listHead, wide && { paddingHorizontal: 20 }]}>
          <View style={s.searchBox}>
            <Icon name="search" size={17} color={T.muted} />
            <TextInput value={p.search} onChangeText={p.setSearch} placeholder="Search scanner data..." placeholderTextColor={T.muted} style={s.searchInput} autoCorrect={false} />
            {!!p.search && <TouchableOpacity onPress={() => p.setSearch('')} hitSlop={HIT}><Icon name="close" size={16} color={T.muted} /></TouchableOpacity>}
          </View>
        </View>
        {p.loading ? <Loader label="Loading…" /> : (
          <FlatList
            key={`c${cols}`}
            data={p.rows}
            numColumns={cols}
            columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
            keyExtractor={(r, i) => `${str(r.UId)}_${str(r.SrNo)}_${i}`}
            contentContainerStyle={[{ padding: 12, paddingBottom: 40 }, wide && { paddingHorizontal: 20 }]}
            ListEmptyComponent={<EmptyState icon="fact-check" title="No Data Found" subtitle="No checking entries for this list" />}
            renderItem={({ item }) => {
              const tracked = Number(item.islasttakatrack) === 1;
              const last = Number(item.islasttaka) === 1;
              return (
                <View style={[s.rowCard, { flex: 1 / cols }]}>
                  <View style={s.rowHead}>
                    <Text style={s.rowTitle} numberOfLines={1}>{str(item.DsnName) || '-'}</Text>
                    {!!item.GrdName && <Pill label={str(item.GrdName)} fg={T.green} bg={`${T.green}14`} />}
                  </View>
                  <View style={s.metaRow}>
                    <Meta k="BEAM NO" v={str(item.BeamNo)} />
                    <Meta k="TAKA" v={str(item.TakaNo)} />
                    <Meta k="METER" v={`${str(item.Qty)} m`} />
                  </View>
                  <View style={s.metaRow}>
                    <Meta k="WEIGHT" v={str(item.Wt)} />
                    <Meta k="AVG WT" v={str(item.AvgWt)} />
                    <Meta k="LINKED ORDER" v={str(item.LinkedOrderNo)} />
                  </View>
                  <Text style={s.rowSub} numberOfLines={1}>Design: {str(item.OrdDsnName || item.DsnName)}</Text>
                  {last && (
                    <View style={s.lastBox}>
                      <Text style={s.lastText}>Last Taka Already Set</Text>
                      <Btn small title="Remove Last Taka" icon="lock-open" variant="danger" loading={p.busy} onPress={() => p.onRemoveLast(item)} />
                    </View>
                  )}
                  <View style={s.actRow}>
                    <TouchableOpacity onPress={() => p.onFaults(item)} style={[s.act, { backgroundColor: `${T.amber}18`, flexDirection: 'row', gap: 5, paddingHorizontal: 12, width: undefined }]} hitSlop={HIT}>
                      <Icon name="report-problem" size={17} color={T.amber} />
                      <Text style={[s.actText, { color: T.amber }]}>Faults</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={() => p.onPrint(item)} style={s.act} hitSlop={HIT}>
                      <Icon name="local-printshop" size={18} color={T.blue} />
                    </TouchableOpacity>
                    <TouchableOpacity disabled={tracked} onPress={() => p.onDelete(item)} style={[s.act, { backgroundColor: `${T.red}10` }, tracked && { opacity: 0.4 }]} hitSlop={HIT}>
                      <Icon name="delete-outline" size={18} color={tracked ? T.muted : T.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </ViewShell>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={s.metaK}>{k}</Text>
      <Text style={s.metaV} numberOfLines={1}>{v || '-'}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  QR camera (expo-camera, same as WeftIssue)                                 */
/* -------------------------------------------------------------------------- */

function ScannerModal({ visible, onClose, onScan }: { visible: boolean; onClose: () => void; onScan: (v: string) => void }) {
  const [perm, requestPerm] = useCameraPermissions();
  const lock = useRef(false);
  useEffect(() => {
    if (visible) lock.current = false;
  }, [visible]);
  // ask as soon as the modal is open AND the permission state has loaded (perm is null on first render)
  useEffect(() => {
    if (visible && perm && !perm.granted && perm.canAskAgain) void requestPerm();
  }, [visible, perm?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={s.camTop}>
          <Text style={s.camTitle}>Scan Taka QR Code</Text>
          <TouchableOpacity onPress={onClose} hitSlop={HIT}><Icon name="close" size={24} color="#fff" /></TouchableOpacity>
        </View>
        {perm?.granted ? (
          <View style={{ flex: 1 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }: { data: string }) => {
                if (lock.current) return;
                lock.current = true;
                onScan(data || '');
                setTimeout(() => { lock.current = false; }, 2000);
              }}
            />
            <View pointerEvents="none" style={s.camFrameWrap}><View style={s.camFrame} /></View>
          </View>
        ) : (
          <View style={s.camNo}>
            <Icon name="camera-alt" size={36} color="#fff" />
            <Text style={s.camNoText}>Camera permission is required</Text>
            <Btn title="Grant Permission" icon="photo-camera" variant="accent" onPress={() => requestPerm()} />
          </View>
        )}
        <View style={{ padding: 16 }}><Btn title="Stop Scanning" variant="secondary" onPress={onClose} /></View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  body: { padding: 12, paddingBottom: 30, width: '100%', maxWidth: 1040, alignSelf: 'center' },
  wideRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  row2: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  col: { flex: 1, minWidth: 130 },
  label: { fontSize: 11, fontWeight: '800', color: T.ink, marginBottom: 5 },
  muted: { fontSize: 12.5, fontWeight: '600', color: T.muted },

  tabs: { flexDirection: 'row', gap: 6, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 4, marginBottom: 10 },
  tab: { flex: 1, minHeight: 42, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabOn: { backgroundColor: T.nav },
  tabText: { fontSize: 13, fontWeight: '900', color: T.ink },

  scanBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, borderLeftColor: T.copper, borderRadius: 12, padding: 12, marginBottom: 10 },
  scanIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: `${T.copper}14`, alignItems: 'center', justifyContent: 'center' },
  scanTitle: { fontSize: 15, fontWeight: '900', color: T.ink },
  scanSub: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },

  avg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.sub, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 10 },
  avgK: { fontSize: 10, fontWeight: '900', color: T.muted, letterSpacing: 0.5 },
  avgV: { fontSize: 17, fontWeight: '900', color: T.copper, fontFamily: MONO },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minWidth: 70, height: 36, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: T.nav, borderColor: T.nav },
  chipText: { fontSize: 12.5, fontWeight: '800', color: T.ink },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6, marginBottom: 6 },
  check: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: T.muted, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 13.5, fontWeight: '800', color: T.ink },

  mending: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.sub, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 10 },
  mendIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  mendTitle: { fontSize: 13, fontWeight: '900', color: T.ink },
  mendSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },

  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, width: '100%', alignSelf: 'center' },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,27,42,0.35)', alignItems: 'center', justifyContent: 'center', zIndex: 50, elevation: 50 },
  delBox: { backgroundColor: T.surface, borderRadius: 14, padding: 20, alignItems: 'center', minWidth: 220 },
  delText: { marginTop: 10, fontWeight: '800', color: T.ink },

  listHead: { paddingHorizontal: 12, paddingTop: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 44, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 11 },
  searchInput: { flex: 1, fontSize: 13.5, color: T.ink, paddingVertical: 0 },
  rowCard: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, borderLeftColor: T.yd, padding: 12, marginBottom: 10 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowTitle: { flex: 1, fontSize: 14.5, fontWeight: '900', color: T.ink },
  rowSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 8 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 9 },
  metaK: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.3 },
  metaV: { fontSize: 13, fontWeight: '800', color: T.ink, marginTop: 1, fontFamily: MONO },
  lastBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10, padding: 8, borderRadius: 9, backgroundColor: `${T.red}0D` },
  lastText: { flex: 1, fontSize: 12, fontWeight: '900', color: T.red },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  act: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.blue}10` },
  actText: { fontSize: 12.5, fontWeight: '900' },

  camTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: Platform.OS === 'web' ? 16 : 44 },
  camTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
  camFrameWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  camFrame: { width: 240, height: 240, borderWidth: 3, borderColor: T.copper, borderRadius: 18 },
  camNo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  camNoText: { color: '#fff', fontSize: 13.5, fontWeight: '700', textAlign: 'center' },
});

