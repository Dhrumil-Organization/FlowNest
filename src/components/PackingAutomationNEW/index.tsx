// FILE: src/components/PackingAutomationNEW/index.tsx
// NEW ERP — Packing Automation. React Native (iOS / Android / web) rebuild of
// the React Web ERP screen PackingAutomation.jsx as a 3-step flow:
//
//   1 Route    facility · scan / type route card · auto-filled route details
//   2 Details  party → ONE production type → carton & weight → grade → merge → marka → print no.
//   3 Print    cones · label copies · Requir patti · printer → Print
//   ✓ Done     what was printed · Pack next box (same route) · New route card · Reprint
//
// Every later screen carries forward all earlier choices (SelectionsCard),
// each group with an Edit link back to its step. Phones get one column;
// tablets / web (≥ 900 px) get the form on the left and the selections on the right.
//
// Rights: resource 'production.packing_automation' (production.module.ts):
//   view = open the screen · add = print labels (web checked rights.add).
// Token + host: ErpSessionGate (screens/production/PackingAutomationScreen.tsx).
// Rules + bug fixes vs the web screen: usePackingForm.ts. HTTP: api.ts.
import { useBusinessContext } from '@/src/core/business';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { confirmAsync } from '../ProductionOrderNEW/ui';
import type { Api, Ctx, Printer, Row } from './api';
import { apiErrorText, fetchPrinters } from './api';
import DetailsStep from './DetailsStep';
import DoneStep from './DoneStep';
import PrintStep from './PrintStep';
import RouteStep, { FacilitySheet } from './RouteStep';
import { Btn, Notice, ProgressSteps, SelectionsCard } from './ui';
import type { Errors, Step } from './usePackingForm';
import { isSameRoute, routeRowView, usePackingForm, validate } from './usePackingForm';

export const PA_RESOURCE = 'production.packing_automation';
const CTX_KEY = 'packing_auto_ctx_v1';
const PRINTER_KEY = (prpcode: string) => `packing_auto_printer_v1_${prpcode}`;

type Props = { token: string; API: string; username?: string; userId?: string; isvis?: string };

const STEP_FIELDS: Record<1 | 2 | 3, (keyof Errors)[]> = {
  1: ['facility', 'route'],
  2: ['party', 'prodtype', 'carton', 'carwt', 'grade', 'merge', 'smarka', 'printno'],
  3: ['nocones', 'noprint', 'printer'],
};
const onlyStep = (e: Errors, s: 1 | 2 | 3): Errors =>
  Object.fromEntries(Object.entries(e).filter(([k]) => STEP_FIELDS[s].includes(k as keyof Errors))) as Errors;

export default function PackingAutomationNEW({ token, API, username, userId, isvis }: Props) {
  const biz = useBusinessContext();
  const { canDo } = usePermission();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const api = useMemo<Api>(() => ({ API, token }), [API, token]);

  const [ctx, setCtx] = useState<Ctx>({ prpcode: biz.prpCode || '', yearno: biz.yearNo || '', strcode: '' });
  const [facility, setFacility] = useState('');
  const [ready, setReady] = useState(false);
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [tried, setTried] = useState<Record<number, boolean>>({});
  const [reprinting, setReprinting] = useState(false);

  const uid = String(userId || username || '');
  const { f, routes, linked, busy, problem, lastPrint, actions } = usePackingForm(api, ctx, uid);
  const canPrint = canDo(PA_RESOURCE, 'add');

  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printersBusy, setPrintersBusy] = useState(false);
  const [printersError, setPrintersError] = useState('');
  const [printerLocked, setPrinterLocked] = useState(false);

  // Last facility chosen on this screen wins over the login default for the same property.
  useEffect(() => {
    AsyncStorage.getItem(CTX_KEY).then((raw) => {
      try {
        const saved = raw ? JSON.parse(raw) : null;
        if (saved?.ctx?.prpcode && (!biz.prpCode || saved.ctx.prpcode === biz.prpCode)) {
          setCtx(saved.ctx);
          setFacility(saved.name || saved.ctx.prpcode);
        } else if (biz.prpCode) {
          setFacility(biz.prpCode);
        }
      } catch { /* ignore */ }
      setReady(true);
    });
  }, [biz.prpCode]);

  /**
   * Printers — same rules as the web PrinterSelect:
   *  • Rayons (prptype 'R') normal users (isvis ≠ '-999') with a printer named
   *    MTX_BAR_<userid> are locked to it.
   *  • Everyone else may choose; the last printer used on this device for this
   *    facility is pre-selected when it is still in the list.
   */
  const loadPrinters = async () => {
    setPrintersBusy(true); setPrintersError('');
    try {
      const list = await fetchPrinters(api);
      setPrinters(list);
      const own = list.find((p) => p.name === `MTX_BAR_${userId || ''}`);
      const lock = biz.prpGroup === 'R' && String(isvis ?? '') !== '-999' && !!own && !!userId;
      setPrinterLocked(lock);
      if (lock && own) { actions.set('printer', own.name); return; }
      const saved = ctx.prpcode ? await AsyncStorage.getItem(PRINTER_KEY(ctx.prpcode)) : null;
      const keep = [f.printer, saved].find((n) => n && list.some((p) => p.name === n));
      actions.set('printer', keep || '');
    } catch (e) {
      setPrintersError(apiErrorText(e, 'Printers could not be loaded.'));
    } finally {
      setPrintersBusy(false);
    }
  };
  useEffect(() => { if (ctx.prpcode) loadPrinters(); }, [api, ctx.prpcode]); // eslint-disable-line react-hooks/exhaustive-deps
  // The printer is remembered per facility on this device.
  useEffect(() => {
    if (ctx.prpcode && f.printer) AsyncStorage.setItem(PRINTER_KEY(ctx.prpcode), f.printer);
  }, [ctx.prpcode, f.printer]);

  const applyFacility = (c: Ctx, name: string) => {
    setCtx(c); setFacility(name); setFacilityOpen(false); setStep(1); setTried({});
    AsyncStorage.setItem(CTX_KEY, JSON.stringify({ ctx: c, name }));
  };

  // Android back = previous step.
  useEffect(() => {
    if (Platform.OS !== 'android' || step === 1) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setStep((s) => (s === 4 ? 3 : ((s - 1) as Step))); return true; });
    return () => sub.remove();
  }, [step]);

  if (!ready) return null;

  const all = validate(f, ctx, 3);
  const errorsFor = (s: 1 | 2 | 3): Errors => (tried[s] ? onlyStep(all, s) : {});
  const stepOk = (s: 1 | 2 | 3) => Object.keys(onlyStep(validate(f, ctx, s), s)).length === 0;

  const goTo = (s: Step) => setStep(s);
  const next = async (from: 1 | 2) => {
    setTried((t) => ({ ...t, [from]: true }));
    if (stepOk(from)) setStep((from + 1) as Step);
  };
  const doPrint = async () => {
    setTried((t) => ({ ...t, 2: true, 3: true }));
    if (!stepOk(2)) { setStep(2); return; }
    if (!stepOk(3)) return;
    if (await actions.print()) setStep(4);
  };
  const reprint = async () => {
    if (!lastPrint) return;
    const n = lastPrint.copies;
    const okGo = await confirmAsync('Reprint label?', `This prints ${n} more label${n === 1 ? '' : 's'} for the same box on ${f.printer}.`, 'Reprint');
    if (!okGo) return;
    setReprinting(true);
    await actions.print();
    setReprinting(false);
  };
  /**
   * Pick / change the route card. Changing it after details were entered asks first,
   * then clears party, production type, carton, weights, grade, merge, marka and cones
   * and loads them again for the new card. Picking the same card again changes nothing.
   */
  const changeRoute = async (row: Row): Promise<boolean> => {
    if (isSameRoute(f.route, row)) return true;
    const entered = !!(f.party || f.prodtype || f.nocones || lastPrint);
    if (f.route && entered) {
      const no = routeRowView(row).routeNo;
      const okGo = await confirmAsync(
        'Change route card?',
        `Party, production type, carton, grade, merge, shipping marka and cones will be cleared and loaded again for route card ${no}.`,
        'Change',
      );
      if (!okGo) return false;
    }
    actions.chooseRoute(row);
    setTried({}); // start the new card without old error messages
    return true;
  };
  const copies = parseInt(f.noprint, 10) || 1;

  /* ------------------------------ body ------------------------------ */

  const form = (
    <>
      {step === 1 ? (
        <RouteStep f={f} ctx={ctx} facility={facility} onFacility={() => setFacilityOpen(true)} routes={routes} busy={busy} problem={problem}
          errors={errorsFor(1)} onChoose={changeRoute} onReload={actions.reloadRoutes} />
      ) : null}
      {step === 2 ? (
        <DetailsStep f={f} api={api} ctx={ctx} linked={linked} busy={busy} problem={problem} errors={errorsFor(2)} actions={actions} />
      ) : null}
      {step === 3 ? (
        <PrintStep f={f} errors={errorsFor(3)} printError={problem.print} printers={printers} printersBusy={printersBusy}
          printersError={printersError} printerLocked={printerLocked} onReloadPrinters={loadPrinters} actions={actions} />
      ) : null}
      {step === 4 && lastPrint ? (
        <DoneStep f={f} facility={facility} result={lastPrint} printError={problem.print} onReprint={reprint} reprinting={reprinting} />
      ) : null}
    </>
  );
  const carried = step === 2 || step === 3
    ? <SelectionsCard f={f} facility={facility} upTo={(step - 1) as 1 | 2} onEdit={goTo} />
    : null;

  /* ------------------------------ footer ------------------------------ */

  let footer: React.ReactNode = null;
  if (step === 1) {
    footer = <Btn flex label="Continue to details" icon="arrow-forward" onPress={() => next(1)} disabled={busy.defaults || !f.route} />;
  } else if (step === 2) {
    footer = (
      <>
        <Btn kind="ghost" label="Back" onPress={() => goTo(1)} />
        <Btn flex label="Continue to print" icon="arrow-forward" onPress={() => next(2)} disabled={busy.party || busy.carton} />
      </>
    );
  } else if (step === 3) {
    footer = (
      <>
        <Btn kind="ghost" label="Back" onPress={() => goTo(2)} disabled={busy.print} />
        <Btn flex kind="copper" icon="qr-code-2" label={`Print ${copies} QR label${copies === 1 ? '' : 's'}`} onPress={doPrint} loading={busy.print} disabled={!canPrint} />
      </>
    );
  } else if (step === 4) {
    footer = (
      <View style={{ flex: 1, gap: 10 }}>
        <Btn label="Pack next box · same route" icon="add" onPress={() => { actions.clearPrintResult(); setStep(3); }} disabled={reprinting} />
        <Btn kind="ghost" label="Scan a new route card" onPress={() => { actions.newRoute(); setTried({}); setStep(1); }} disabled={reprinting} />
      </View>
    );
  }

  const maxW = wide && carried ? 1180 : wide && step === 1 ? 860 : 680;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: maxW }}>
          {step <= 3 ? <ProgressSteps step={step} /> : null}
          {!canPrint ? <Notice tone="info" text="You can look up route cards, but you don't have the right to print packing labels." /> : null}
          {wide && carried ? (
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
              <View style={{ flex: 3, minWidth: 0 }}>{form}</View>
              <View style={{ flex: 2, minWidth: 0 }}>{carried}</View>
            </View>
          ) : (
            <>
              {carried}
              {form}
            </>
          )}
        </View>
      </ScrollView>
      <View style={{ backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: maxW, flexDirection: 'row', gap: 10 }}>{footer}</View>
      </View>
      <FacilitySheet open={facilityOpen} onClose={() => setFacilityOpen(false)} ctx={ctx} onApply={applyFacility} api={api} prptype={biz.prpGroup} />
    </KeyboardAvoidingView>
  );
}
