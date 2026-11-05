// FILE: src/components/SalesChallanPackingSlipNEW/SlipForm.tsx
// One packing slip — opened from the list (index.tsx), like ProductionOrderNEW's OrderForm.
//   New / Modify   1 Slip & orders  ·  2 Assign qty (AllocateStep) → Save
//   View           summary + lines · Scan cartons · Modify · Delete
//   Scan           per line: scan cartons (gun / camera / type) → Save cartons
// Web: SalesChallanPackingSlip.js (/saleschallanpackingslip/:type/:id).
// After Save the form switches to view / scan of the saved UID itself; Back / Delete return to the list.
import { T } from '@/src/theme';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { confirmAsync } from '../ProductionOrderNEW/ui';
import { Btn, LinkBtn, Notice, tab, u } from '../PackingAutomationNEW/ui';
import type { Api, Ctx, Mode, PartyScope, Row } from './api';
import AllocateStep from './AllocateStep';
import CartonScanSheet from './CartonScanSheet';
import type { ScanDevice } from './ScanDevices';
import { SlipStrip, SlipSummary, StockLine } from './Lines';
import OrderSheet from './OrderSheet';
import ProdTypeSheet from './ProdTypeSheet';
import { n3, opensPendingOrders, pick, qty, splitTypes } from './rules';
import SlipStep from './SlipStep';
import { Steps, Tag } from './ui';
import { useSlipForm } from './useSlipForm';

export type Rights = { add: boolean; edit: boolean; del: boolean; scan: boolean; assign: boolean };

type Props = {
  api: Api; ctx: Ctx; facility: string;
  /** Opens the facility sheet (owned by the list). Only offered on a new slip. */
  onFacility: () => void;
  mode: Mode; uid?: string; rights: Rights; scope?: PartyScope;
  /** Back to the list; `refresh` = something was saved. */
  onBack: (refresh?: boolean) => void;
  onDeleted: (packingNo: string) => void;
};

export default function SlipForm({ api, ctx, facility, onFacility, mode: startMode, uid: startUid, rights, scope, onBack, onDeleted }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  /** A mode the user may not use falls back to view — never to a form they can't save. */
  const allowed = (m: Mode, id?: string): Mode => {
    const has = !!id && id !== '0';
    if (m === 'edit' && has) return rights.edit ? 'edit' : 'view';
    if (m === 'scan' && has) return rights.scan ? 'scan' : 'view';
    if (has) return 'view';
    return 'add';
  };
  const [nav, setNav] = useState<{ mode: Mode; uid?: string }>(() => ({ mode: allowed(startMode, startUid), uid: startUid }));
  const [step, setStep] = useState<1 | 2 | 3>(nav.mode === 'edit' ? 2 : 1);
  const [sheet, setSheet] = useState<'' | 'orders' | 'types'>('');
  const [scanRow, setScanRow] = useState<Row | null>(null);
  const [scanDevice, setScanDevice] = useState<ScanDevice>('hardware');
  const [flash, setFlash] = useState<{ tone: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [dateError, setDateError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false); // tell the list to reload on Back

  const mode = nav.mode;
  const { f, stock, meta, extraPer, busy, problem, totals, actions } = useSlipForm(api, ctx, mode, nav.uid, { assignRight: rights.assign, scope });

  const go = (m: Mode, id?: string, msg?: { tone: 'ok' | 'err' | 'info'; text: string }) => {
    const next = allowed(m, id);
    setNav({ mode: next, uid: next === 'add' ? undefined : id }); setStep(next === 'edit' ? 2 : 1); setScanRow(null); setFlash(msg || null);
  };
  const back = () => onBack(saved);

  // No add right: a new slip can't be opened at all (deep link / stale button) — straight back to the list.
  useEffect(() => { if (nav.mode === 'add' && !rights.add) onBack(); }, [nav.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Web checks the number on suffix blur; here a short pause after typing.
  const firstSuffix = useRef(true);
  useEffect(() => {
    if (firstSuffix.current) { firstSuffix.current = false; return undefined; }
    if (mode !== 'add' && mode !== 'edit') return undefined;
    const t = setTimeout(() => actions.checkVoucher({ suffix: String(f.suffix ?? '') }), 700);
    return () => clearTimeout(t);
  }, [f.suffix]); // eslint-disable-line react-hooks/exhaustive-deps

  // Android back = previous step.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (scanRow) return false; // the carton screen handles its own Back (camera → cartons → locations → slip)
      if (step === 3 && mode === 'edit') setStep(2); else if (step === 2 && (mode === 'add' || mode === 'edit')) setStep(1); else back();
      return true;
    });
    return () => sub.remove();
  }, [step, mode, saved, scanRow]); // eslint-disable-line react-hooks/exhaustive-deps


  /* ------------------------------ actions ------------------------------ */

  const onSave = async () => {
    if (!(mode === 'scan' ? rights.scan : mode === 'edit' ? rights.edit : rights.add)) return;
    const id = await actions.save();
    if (!id) return;
    setSaved(true);
    const warn = actions.saveWarning(); // slip saved, but not every carton change went through
    go(mode === 'scan' ? 'scan' : 'view', id, warn
      ? { tone: 'err', text: warn }
      : { tone: 'ok', text: mode === 'scan' ? 'Cartons saved.' : 'Packing slip saved.' });
  };
  const onDelete = async () => {
    if (!rights.del) return;
    if (!(await confirmAsync('Delete packing slip?', `Packing slip ${pick(f, 'ChalNo')} (UID ${pick(f, 'UId')}) will be deleted. This cannot be undone.`, 'Delete', true))) return;
    if (await actions.remove()) onDeleted([pick(f, 'ChalNo'), pick(f, 'suffix')].filter(Boolean).join(' / '));
  };
  const onGetStock = async () => { if (await actions.getStock()) setStep(2); };
  const confirmPartyChange = () =>
    (f.d1 || []).length
      ? confirmAsync('Change party?', 'The order lines, stock and scanned cartons of this slip will be cleared.', 'Change')
      : Promise.resolve(true);

  /* ------------------------------ body ------------------------------ */

  const editing = mode === 'add' || mode === 'edit';
  const headerLocked = mode === 'view' || mode === 'scan'; // web BothDisabled
  const no = [pick(f, 'ChalNo'), pick(f, 'suffix')].filter(Boolean).join(' / ');
  const statusTag = <Tag text={mode === 'add' ? 'New' : mode === 'edit' ? 'Modify' : mode === 'scan' ? 'Scan' : pick(f, 'Status') === 'C' ? 'Closed' : 'Saved'}
    tone={mode === 'add' ? 'green' : mode === 'edit' ? 'amber' : 'copper'} />;
  const canDelete = mode === 'view' && rights.del && pick(f, 'UId') && pick(f, 'Status') !== 'C' && pick(f, 'GPStatus') !== 'C';

  const title = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', marginLeft: -6, marginTop: -8 }}><LinkBtn label="Packing slips" icon="arrow-back" onPress={back} /></View>
        <Text style={u.kicker}>Sales challan packing slip</Text>
        <Text style={[{ fontSize: 22, fontWeight: '800', color: T.ink, marginTop: 2 }, tab]}>{no ? `No. ${no}` : 'New packing slip'}</Text>
      </View>
      {statusTag}
    </View>
  );

  // Modify → step 3 "Cartons": every assigned line, each with its own item / merge / grade / shade carton stock.
  const cartonStep = mode === 'edit' && step === 3;
  const canCartons = mode === 'edit' ? rights.edit : rights.scan;
  const cartonLines = stock.filter((r) => n3(r.AssQty) > 0).length;

  const lines = (
    <>
      {problem.stock ? <Notice tone="err" text={problem.stock} action={mode === 'add' ? { label: 'Retry', onPress: onGetStock } : undefined} /> : null}
      {stock.length === 0 && !problem.stock ? (
        <Notice tone="info" text={mode === 'scan' ? 'This slip has no assigned lines to scan.' : 'No stock lines yet.'} />
      ) : null}
      {stock.map((r, i) => (cartonStep && !(n3(r.AssQty) > 0) ? null : (
        <StockLine key={`${r.SrNo}-${r.ItmCode}-${r.MerCode}-${r.GrdCode}-${r.ShdCode}-${i}`} row={r} mode={mode} d2={f.d2 || []}
          cartonStep={cartonStep}
          onAssign={editing && !cartonStep ? (v) => actions.setAssign(i, v) : undefined}
          onScan={(d) => { if (!canCartons) return; setScanDevice(d); setScanRow(r); }} />
      )))}
    </>
  );

  let body: React.ReactNode;
  let side: React.ReactNode = null;
  if (editing && step === 1) {
    body = (
      <SlipStep f={f} ctx={ctx} facility={facility} onFacility={onFacility} facilityLocked={mode !== 'add'}
        headerLocked={false} meta={meta} busy={busy} problem={problem} actions={actions}
        onOpenOrders={() => setSheet('orders')} onOpenTypes={() => setSheet('types')}
        onPartyChosen={() => { if (opensPendingOrders(meta.prpType, ctx.strcode)) setSheet('orders'); }}
        confirmPartyChange={confirmPartyChange} dateError={dateError} setDateError={setDateError} />
    );
  } else {
    side = (
      <>
        {editing && !wide
          ? <SlipStrip f={f} onEdit={() => setStep(1)} />
          : <SlipSummary f={f} facility={facility} onEdit={editing ? () => setStep(1) : undefined} />}
        {canDelete ? <View style={{ alignItems: 'center' }}><LinkBtn label="Delete this packing slip" icon="delete-outline" onPress={onDelete} /></View> : null}
      </>
    );
    body = (
      <>
        {(mode === 'scan' || cartonStep) && totals.cartonTarget ? (
          <View style={[u.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={u.kicker}>Scanned so far</Text>
              <Text style={[{ fontSize: 20, fontWeight: '800', color: T.ink, marginTop: 2 }, tab]}>{totals.cartons} of {totals.cartonTarget} cartons</Text>
            </View>
            <Text style={[{ fontSize: 16, fontWeight: '800', color: T.ink }, tab]}>{qty(totals.cartonQty)}</Text>
          </View>
        ) : null}
        {cartonStep ? (
          <>
            <Text style={[u.kicker, { marginBottom: 8, marginTop: 4 }]}>Cartons · {cartonLines} line{cartonLines === 1 ? '' : 's'}</Text>
            {cartonLines ? lines : <Notice tone="info" text="No line has assign qty — go back and assign qty first." />}
          </>
        ) : editing ? (
          <>
            {problem.stock ? <Notice tone="err" text={problem.stock} action={mode === 'add' ? { label: 'Retry', onPress: onGetStock } : undefined} /> : null}
            {stock.length ? <AllocateStep stock={stock} mode={mode} setAssign={actions.setAssign} setMany={actions.setAssignMany} />
              : !problem.stock ? <Notice tone="info" text="No stock lines yet." /> : null}
          </>
        ) : (
          <>
            <Text style={[u.kicker, { marginBottom: 8, marginTop: 4 }]}>{mode === 'scan' ? 'Lines to scan' : 'Lines'} · {stock.length}</Text>
            {lines}
          </>
        )}
      </>
    );
  }

  /* ------------------------------ footer ------------------------------ */

  let footer: React.ReactNode = null;
  if (editing && step === 1) {
    footer = mode === 'add'
      ? <Btn flex label={stock.length ? 'Refresh stock' : 'Get stock'} icon="arrow-forward" onPress={onGetStock} loading={busy.stock} disabled={!pick(f, 'ParCode') || !(f.d1 || []).length} />
      : <Btn flex label="Continue to assign qty" icon="arrow-forward" onPress={() => setStep(2)} />;
    if (mode === 'edit') footer = <><Btn kind="ghost" label="Cancel" onPress={() => go('view', nav.uid)} />{footer}</>;
  } else if (cartonStep) {
    footer = (
      <>
        <Btn kind="ghost" label="Back" onPress={() => setStep(2)} disabled={busy.save} />
        <Btn flex kind="copper" icon="save" label={`Save · ${qty(totals.assigned)} · ${totals.cartons} ctn`} onPress={onSave} loading={busy.save} />
      </>
    );
  } else if (editing && mode === 'edit') {
    // Modify: qty → cartons → one Save for both.
    footer = (
      <>
        <Btn kind="ghost" label="Back" onPress={() => setStep(1)} />
        <Btn flex label="Continue to cartons" icon="arrow-forward" onPress={() => setStep(3)} disabled={!stock.some((r) => n3(r.AssQty) > 0)} />
      </>
    );
  } else if (editing) {
    footer = (
      <>
        <Btn kind="ghost" label="Back" onPress={() => setStep(1)} disabled={busy.save} />
        <Btn flex kind="copper" icon="save" label={totals.lines ? `Save · ${qty(totals.assigned)}` : 'Save packing slip'} onPress={onSave} loading={busy.save} />
      </>
    );
  } else if (mode === 'view') {
    // Buttons the user has no right for are not shown (same as ProductionOrderNEW OrdersList).
    const closed = pick(f, 'Status') === 'C';
    footer = (
      <>
        {rights.edit && !closed ? <Btn kind="ghost" label="Modify" icon="edit" onPress={() => go('edit', nav.uid)} /> : null}
        {rights.scan ? <Btn flex kind="copper" icon="qr-code-scanner" label="Scan cartons" onPress={() => go('scan', nav.uid)} /> : null}
        {!rights.scan && rights.add ? <Btn flex label="New packing slip" icon="add" onPress={() => go('add')} /> : null}
      </>
    );
    if (!rights.edit && !rights.scan && !rights.add) footer = null;
  } else if (mode === 'scan') {
    footer = (
      <>
        <Btn kind="ghost" label="Close" onPress={() => go('view', nav.uid)} disabled={busy.save} />
        <Btn flex kind="copper" icon="save" label={`Save cartons · ${totals.cartons}`} onPress={onSave} loading={busy.save} />
      </>
    );
  }

  const maxW = wide && side ? 1180 : 680;

  const cartonScreen = (
    <CartonScanSheet open={!!scanRow} row={scanRow} d1={f.d1 || []} extraPer={extraPer} d2={f.d2 || []} uid={f.UId} device={scanDevice} loadCartons={actions.loadCartons}
      onClose={() => setScanRow(null)}
      onDone={(sr, cartons) => {
        actions.applyCartons(sr, cartons);
        setScanRow(null);
        setFlash({ tone: 'info', text: `Sr ${sr}: ${cartons.length} carton${cartons.length === 1 ? '' : 's'} ready. Tap ${mode === 'edit' ? 'Save' : 'Save cartons'} to keep them.` });
      }} />
  );
  // Carton selection is a STEP of this screen (like WarehouseNEW's scanner step), not a Modal: on Android a Modal is
  // a separate dialog window, and the Urovo scan engine reported "none" there while it works in WarehouseNEW.
  if (scanRow) return <View style={{ flex: 1, backgroundColor: T.bg }}>{cartonScreen}</View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: maxW }}>
          {title}
          {editing ? <Steps labels={mode === 'edit' ? ['Slip & orders', 'Assign qty', 'Cartons'] : ['Slip & orders', 'Assign qty']} step={step} /> : null}
          {flash ? <Notice tone={flash.tone} text={flash.text} action={{ label: 'OK', onPress: () => setFlash(null) }} /> : null}
          {busy.load ? <Notice tone="info" text="Loading packing slip…" /> : null}
          {problem.load ? <Notice tone="err" text={problem.load} action={{ label: 'Retry', onPress: actions.reload }} /> : null}
          {problem.save ? <Notice tone="err" text={problem.save} /> : null}
          {!ctx.strcode ? <Notice tone="info" text="Choose the facility, year and store first." action={{ label: 'Choose', onPress: onFacility }} /> : null}
          {wide && side ? (
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
              <View style={{ flex: 3, minWidth: 0 }}>{body}</View>
              <View style={{ flex: 2, minWidth: 0 }}>{side}</View>
            </View>
          ) : (
            <>
              {side}
              {body}
            </>
          )}
        </View>
      </ScrollView>

      {footer ? (
        <View style={{ backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16, alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: maxW, flexDirection: 'row', gap: 10 }}>{footer}</View>
        </View>
      ) : null}

      <OrderSheet open={sheet === 'orders'} onClose={() => setSheet('')} partyName={pick(f, 'ParName')} existing={f.d1 || []}
        prpType={meta.prpType} strDesc={meta.strDesc} load={actions.loadPendingOrders}
        onAdd={(rows) => { actions.addOrders(rows); setSheet(''); }} />
      <ProdTypeSheet open={sheet === 'types'} onClose={() => setSheet('')} value={splitTypes(f.ProdTtype)} prpType={meta.prpType}
        load={actions.loadProdTypes} onApply={(codes) => { actions.set('ProdTtype', codes); setSheet(''); }} />
    </KeyboardAvoidingView>
  );
}
