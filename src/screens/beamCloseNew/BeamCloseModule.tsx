// FILE: src/screens/beamCloseNew/BeamCloseModule.tsx
// NEW ERP — Beam Close ("Beam Open/Close"). Port of the legacy module used by
// app/(tabs)/beam-close.tsx:
//   components/BeamClose/index.tsx      (form: year, date, machine, design, beam, save)
//   components/BeamClose/SelectBeam.tsx (→ ClosedBeamSheet.tsx: "Load Beam" / re-open a closed beam)
//   common/API/Functions.fetchAllYeardata (year list)
//
// Flow (identical to legacy):
//   1. Years: GET /api/getyear?prpcode=SIP. When loaded, the year whose YearName equals the
//      FY of today ('YYYY-YYYY', Apr–Mar) is selected and Checking Date = today.
//   2. Whenever YearNo or Checking Date changes (and after Clear Form, which sets a new date):
//      GET /api/get_checking_help {PrpCode:'SIP', yearno, ChkDate DD-MM-YYYY, txntype:'beam_close_tablet'}
//      → machine list.
//   3. Pick machine → MacCode/MacName/PrpCode from the row, design/beam/balance cleared, then
//      GET /api/get_checking_help {… MacCode} → design list; the FIRST row is auto-selected
//      (DsnCode, DsnName, BeamNo, WarpLen, BeamUId, QltWt, UId).
//   4. Pick design → same fields from the chosen row. Beam + Beam Balance (WarpLen) are read-only.
//   5. Date picked → date set and YearNo auto-switched to the matching FY (if it exists).
//      Year picked manually → only YearNo changes (a mismatch is caught on Save / Load Beam).
//   6. ADD BEAM CLOSE → validate FY ("Checking Date (…) belongs to FY (…) but selected year is (…)"),
//      "Please select Machine", "Please select Design" → POST /api/add_beam_close
//      { ShfCode:0, ChkDate, MacGrp:'', PrpCode (from machine row), YearNo, yearno,
//        txntype:'beam_close_tablet', d1:[legacy d1 object], d2:[] }.
//      success === false → Warning(message); otherwise Success(message) + Clear Form.
//      Exception → Error "API Failed".
//   7. CLEAR FORM → reset every field except YearNo, date = today, machine / design lists cleared
//      (machines reload because the date changed — same as legacy).
//   8. LOAD BEAM → FY validation, then the Closed Beam List sheet:
//      GET /api/get_checking_help {PrpCode:'SIP', YearNo, ChkDate, txntype:'beam_open_tablet'},
//      search, "Open Beam" → confirm → POST /api/add_beam_open → form gets BeamNo/Dsn/Mac.
//
// Endpoints (see beamCloseApi.ts):
//   GET  /api/getyear
//   GET  /api/get_checking_help  (machines, designs — txntype beam_close_tablet)
//   GET  /api/get_checking_help  (closed beams — txntype beam_open_tablet)
//   POST /api/add_beam_close
//   POST /api/add_beam_open
//
// Differences vs legacy (UI-only / guards, no business-rule change):
//   • Host + token come from props (ErpSessionGate) instead of common/API/dynamicAPI + AsyncStorage.
//   • Success alert after add_beam_close shows 'Saved successfully.' when the server sends no
//     message (legacy showed the literal text "undefined").
//   • Save button is disabled while the POST is in flight (legacy allowed double taps).
//   • Out-of-order machine/design responses are ignored (legacy's cancel token never worked),
//     and a design response arriving after Clear Form is dropped.
//   • A warning banner shows when Checking Date and selected year disagree (the blocking
//     check on Save / Load Beam is unchanged).
//   • Help-list load failures are shown as a retryable error (legacy only console.logged them).
//   • `isConnected` prop (always true in the legacy route) is not used.
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Banner, Btn, Card, DateField, ErrorBox, MONO, PickerSheet, SelectBox, useWide, ViewShell } from '../inquiry/ui';
import { createBeamCloseApi, dmy, fromDmy, fyOfDate, str, Year } from './beamCloseApi';
import { ClosedBeamSheet } from './ClosedBeamSheet';

type Props = { token: string; API: string; username?: string };
type Values = Record<string, any>;

const initialValues = (yearNo: any = ''): Values => ({
  CheckingDate: new Date(),
  PrpCode: '',
  YearNo: yearNo,
  MacCode: '',
  MacName: '',
  DsnCode: '',
  DsnName: '',
  BeamNo: '',
  WarpLen: '',
  BeamUId: '',
  QltWt: '',
  UId: '',
  islasttaka: 0,
});

export default function BeamCloseModule({ token, API }: Props) {
  const api = useMemo(() => createBeamCloseApi(API, token), [API, token]);
  const { wide } = useWide();

  const [values, setValues] = useState<Values>(() => initialValues());
  const [years, setYears] = useState<Year[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [machineLoading, setMachineLoading] = useState(false);
  const [designLoading, setDesignLoading] = useState(false);
  const [machineErr, setMachineErr] = useState<string | null>(null);
  const [designErr, setDesignErr] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'machine' | 'design'>(null);
  const [beamOpen, setBeamOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // PickerSheet caches a local list; bump to remount it when the list changes.
  const [ver, setVer] = useState(0);

  const set = (patch: Values) => setValues((prev) => ({ ...prev, ...patch }));

  // 1. years
  useEffect(() => {
    if (!token) return;
    let alive = true;
    api.years().then((d) => { if (alive) setYears(Array.isArray(d) ? d : []); });
    return () => { alive = false; };
  }, [api, token]);

  // legacy: when years arrive → FY of today selected, date = today
  useEffect(() => {
    if (!years.length) return;
    const today = new Date();
    const fy = fyOfDate(today);
    const y = years.find((x) => x.YearName === fy);
    if (y) set({ YearNo: y.YearNo, CheckingDate: today });
  }, [years]);

  // 2. machines on YearNo / CheckingDate change (Date identity, like legacy)
  const machineReq = useRef(0);
  const fetchMachines = async () => {
    const id = ++machineReq.current;
    setMachineLoading(true);
    setMachineErr(null);
    try {
      const d = await api.machines({ yearno: values.YearNo, chkDate: dmy(values.CheckingDate) });
      if (id === machineReq.current) { setMachines(d); setVer((v) => v + 1); }
    } catch (e: any) {
      if (id === machineReq.current) setMachineErr(e?.response?.data?.message || e?.message || 'Unable to load machines');
    } finally {
      if (id === machineReq.current) setMachineLoading(false);
    }
  };
  useEffect(() => {
    if (!token) return;
    if (values.YearNo && values.CheckingDate) void fetchMachines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, api, values.YearNo, values.CheckingDate]);

  // 3. designs of a machine, first auto-selected
  const designReq = useRef(0);
  const fetchDesigns = async (macCode: any) => {
    const id = ++designReq.current;
    setDesignLoading(true);
    setDesignErr(null);
    try {
      const d = await api.designs({ yearno: values.YearNo, chkDate: dmy(values.CheckingDate), macCode });
      if (id !== designReq.current) return;
      setDesigns(d);
      setVer((v) => v + 1);
      if (d.length > 0) {
        const first = d[0];
        set({
          DsnCode: first?.DsnCode || '',
          DsnName: first?.DsnName || '',
          BeamNo: first?.BeamNo || '',
          WarpLen: first?.WarpLen || '',
          BeamUId: first?.BeamUId || '',
          QltWt: first?.QltWt || '',
          UId: first?.UId || '',
        });
      }
    } catch (e: any) {
      if (id === designReq.current) setDesignErr(e?.response?.data?.message || e?.message || 'Unable to load designs');
    } finally {
      if (id === designReq.current) setDesignLoading(false);
    }
  };

  const pickMachine = (item: any) => {
    set({
      MacCode: item?.MacCode || '',
      MacName: item?.MacName || '',
      PrpCode: item?.PrpCode || '',
      DsnCode: '',
      DsnName: '',
      BeamNo: '',
      WarpLen: '',
    });
    setSheet(null);
    void fetchDesigns(item?.MacCode);
  };

  const pickDesign = (item: any) => {
    set({
      DsnCode: item?.DsnCode || '',
      DsnName: item?.DsnName || '',
      BeamNo: item?.BeamNo || '',
      WarpLen: item?.WarpLen || '',
      BeamUId: item?.BeamUId || '',
      QltWt: item?.QltWt || '',
      UId: item?.UId || '',
    });
    setSheet(null);
  };

  // 5. date picked → YearNo follows the FY (when that year exists)
  const onDate = (dmyStr: string) => {
    const d = fromDmy(dmyStr);
    if (!d) return;
    const fy = fyOfDate(d);
    const y = fy ? years.find((x) => x.YearName === fy) : undefined;
    set(y ? { CheckingDate: d, YearNo: y.YearNo } : { CheckingDate: d });
  };

  const selectedYear = years.find((y) => y.YearNo === values.YearNo);

  const validateFinancialYear = () => {
    const fy = fyOfDate(values.CheckingDate);
    const matched = years.find((y) => y.YearName === fy);
    const selectedName = selectedYear?.YearName || 'N/A';
    if (!matched || values.YearNo !== matched.YearNo) {
      AppAlert.alert('Warning', `Checking Date (${dmy(values.CheckingDate)}) belongs to FY (${fy}) but selected year is (${selectedName})`);
      return false;
    }
    return true;
  };

  // 7. clear form
  const resetForm = () => {
    setValues((prev) => initialValues(prev.YearNo));
    setMachines([]);
    setDesigns([]);
    setVer((v) => v + 1);
    setDesignErr(null);
    designReq.current++;
  };

  // 6. save
  const save = async () => {
    if (!validateFinancialYear()) return;
    if (!values.MacCode) { AppAlert.alert('Warning', 'Please select Machine'); return; }
    if (!values.DsnCode) { AppAlert.alert('Warning', 'Please select Design'); return; }
    const v = values;
    const d1Obj = {
      AvgWt: v.AvgWt || 0,
      BalLen: null,
      BeamNo: v.BeamNo,
      BeamUId: v.BeamUId,
      ChkCode: v.ChkCode || null,
      ChkName: v.ChkName || null,
      CutLen: null,
      DsnCode: v.DsnCode,
      DsnName: v.DsnName,
      GStatus: null,
      GrdCode: v.GrdCode || '',
      GrdName: v.GrdName || '',
      MacCode: v.MacCode,
      MacName: v.MacName,
      OQty: null,
      PlanSrNo: null,
      PlanUId: null,
      Qty: v.Qty || 0,
      QltWt: v.QltWt,
      RecType: null,
      Remarks: v.Remarks || '',
      SrNo: v.SrNo || 0,
      Status: v.Status || 0,
      SupCode: v.SupCode || '',
      SupName: v.SupName || '',
      TakaNo: v.TakaNo || null,
      TechSup: v.TechSup || '',
      TechSupName: v.TechSupName || '',
      UId: v.UId,
      WarpLen: v.WarpLen,
      Wt: v.Wt || 0,
      WvrCode: v.WvrCode || '',
      WvrName: v.WvrName || '',
      font: 0,
      isalldata: 0,
      islasttaka: v.islasttaka || 0,
      ismending: v.ismending || 0,
    };
    const payload = {
      ShfCode: 0,
      ChkDate: dmy(v.CheckingDate),
      MacGrp: '',
      PrpCode: v.PrpCode,
      YearNo: v.YearNo,
      yearno: v.YearNo,
      txntype: 'beam_close_tablet',
      d1: [d1Obj],
      d2: [],
    };
    setSaving(true);
    try {
      const res = await api.addClose(payload);
      if (res?.success === false) {
        AppAlert.alert('Warning', `${res?.message}`);
      } else {
        AppAlert.alert('Success', res?.message != null ? `${res.message}` : 'Saved successfully.');
        resetForm();
      }
    } catch {
      AppAlert.alert('Error', 'API Failed');
    } finally {
      setSaving(false);
    }
  };

  const loadBeam = () => {
    if (!validateFinancialYear()) return;
    setBeamOpen(true);
  };

  const fyMismatch = !!years.length && (() => {
    const m = years.find((y) => y.YearName === fyOfDate(values.CheckingDate));
    return !m || values.YearNo !== m.YearNo;
  })();

  /* ------------------------------------------------------------------ UI */

  const periodCard = (
    <Card title="Period">
      <Text style={s.label}>Select Year <Text style={{ color: T.red }}>*</Text></Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
        {years.length === 0 ? <Text style={s.muted}>Loading years…</Text> : years.map((y) => {
          const on = y.YearNo === values.YearNo;
          return (
            <TouchableOpacity key={str(y.YearNo)} onPress={() => set({ YearNo: y.YearNo })} style={[s.seg, on && s.segOn]} activeOpacity={0.75}>
              <Text style={[s.segText, on && { color: '#fff' }]}>{str(y.YearName)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <DateField label="Checking Date" required value={dmy(values.CheckingDate)} onChange={onDate} minToday={false} />
      {fyMismatch && <Banner tone="warn" icon="warning-amber" text={`Checking Date belongs to FY ${fyOfDate(values.CheckingDate)}, selected year is ${selectedYear?.YearName || 'N/A'}`} />}
    </Card>
  );

  const beamCard = (
    <Card title="Machine & Beam" right={machineLoading ? <Text style={s.muted}>Loading…</Text> : null}>
      {!!machineErr && <View style={{ marginBottom: 8 }}><ErrorBox text={machineErr} onRetry={fetchMachines} /></View>}
      <SelectBox
        label="Select Machine"
        value={values.MacCode ? `${str(values.MacCode)} - ${str(values.MacName)}` : ''}
        placeholder={machineLoading ? 'Loading machines...' : 'Choose machine...'}
        onPress={() => setSheet('machine')}
        disabled={machineLoading}
        icon="expand-more"
      />
      {!!designErr && <View style={{ marginBottom: 8 }}><ErrorBox text={designErr} onRetry={() => fetchDesigns(values.MacCode)} /></View>}
      <SelectBox
        label="Select Design"
        value={values.DsnCode ? `${str(values.DsnCode)} - ${str(values.DsnName)}` : ''}
        placeholder={designLoading ? 'Loading designs...' : 'Choose design...'}
        onPress={() => setSheet('design')}
        disabled={designLoading}
        icon="expand-more"
      />
      <View style={s.beamRow}>
        <View style={s.beamBox}>
          <Text style={s.beamLbl}>BEAM *</Text>
          <Text style={s.beamVal} numberOfLines={1}>{str(values.BeamNo) || '—'}</Text>
        </View>
        <View style={[s.beamBox, { backgroundColor: `${T.green}10` }]}>
          <Text style={s.beamLbl}>BEAM BALANCE *</Text>
          <Text style={[s.beamVal, { color: T.green }]} numberOfLines={1}>{str(values.WarpLen) || '—'}</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <ViewShell
      title="Beam Open/Close"
      subtitle={`Manage your beam · ${dmy(values.CheckingDate)}${selectedYear ? ` · ${selectedYear.YearName}` : ''}`}
      hideBack
      maxWidth={1040}
      footer={
        <View style={s.footer}>
          <View style={[s.footerInner, wide && { maxWidth: 1040 }]}>
            <Btn title="Clear" icon="refresh" variant="secondary" onPress={resetForm} disabled={saving} style={{ flex: 1 }} />
            <Btn title="Load Beam" icon="download" variant="primary" onPress={loadBeam} disabled={saving} style={{ flex: 1 }} />
            <Btn title="Add Beam Close" icon="check-circle" variant="accent" onPress={save} loading={saving} style={{ flex: wide ? 1.4 : 1.6 }} />
          </View>
        </View>
      }
    >
      {wide ? (
        <View style={s.wideRow}>
          <View style={{ flex: 1 }}>{periodCard}</View>
          <View style={{ flex: 1.3 }}>{beamCard}</View>
        </View>
      ) : (
        <>
          {periodCard}
          {beamCard}
        </>
      )}

      {sheet === 'machine' && (
        <PickerSheet<any>
          key={`m${ver}`}
          visible
          title="Select Machine"
          subtitle={`${machines.length} machine(s) · ${dmy(values.CheckingDate)}`}
          placeholder="Search machine…"
          remote={false}
          onClose={() => setSheet(null)}
          load={async () => machines}
          keyOf={(x, i) => `${str(x.MacCode)}-${i}`}
          render={(x) => ({ title: `${str(x.MacCode)} - ${str(x.MacName)}`, sub: [x.DsnName, x.BeamNo ? `Beam ${x.BeamNo}` : ''].filter(Boolean).join(' · ') || undefined })}
          onPick={pickMachine}
          emptyText="No machine found"
        />
      )}
      {sheet === 'design' && (
        <PickerSheet<any>
          key={`d${ver}`}
          visible
          title="Select Design"
          subtitle={values.MacCode ? `Machine ${str(values.MacCode)} - ${str(values.MacName)}` : 'Select a machine first'}
          placeholder="Search design…"
          remote={false}
          onClose={() => setSheet(null)}
          load={async () => designs}
          keyOf={(x, i) => `${str(x.DsnCode)}-${str(x.BeamUId)}-${i}`}
          render={(x) => ({ title: `${str(x.DsnCode)} - ${str(x.DsnName)}`, sub: `Beam ${str(x.BeamNo) || '-'} · Balance ${str(x.WarpLen) || '-'}` })}
          onPick={pickDesign}
          emptyText="No design found"
        />
      )}

      <ClosedBeamSheet
        visible={beamOpen}
        onClose={() => setBeamOpen(false)}
        api={api}
        values={values}
        onOpened={(patch) => set(patch)}
      />
    </ViewShell>
  );
}

const s = StyleSheet.create({
  wideRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  label: { fontSize: 11, fontWeight: '800', color: T.ink, marginBottom: 5 },
  muted: { fontSize: 12, fontWeight: '600', color: T.muted },
  seg: { minWidth: 90, height: 34, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: T.nav, borderColor: T.nav },
  segText: { fontSize: 12, fontWeight: '800', color: T.ink, fontFamily: MONO },
  beamRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  beamBox: { flex: 1, minWidth: 0, backgroundColor: `${T.copper}0D`, borderRadius: 10, padding: 12 },
  beamLbl: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.4 },
  beamVal: { fontSize: 20, fontWeight: '900', color: T.ink, fontFamily: MONO, marginTop: 3 },
  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, width: '100%', alignSelf: 'center' },
});
