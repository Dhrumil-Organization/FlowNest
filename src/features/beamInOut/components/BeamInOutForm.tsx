// FILE: src/features/beamInOut/components/BeamInOutForm.tsx
// Beam Outward / Beam Inward entry (FAMBOut RType O / I):
//  1 Voucher & Party  →  2 Beams (multi-select help, rate for all, tap a beam for details)  →  3 Job yarn  →  4 Accounts  →  5 Amount & Tax
//  Job yarn (beam JOB work): Outward = yarn sent with the beams (scan cartons, partial qty, GST on the yarn only);
//  Inward = yarn back on the beams (gross − beam weight per beam) + annexure (shortage / wastage / loose / excess).
//  Empty beams never carry GST.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BeamService } from '@/src/api/beamInOutAPI';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import { confirmAsync, notify } from '../../repackingIssue/dialog';
import { cleanDecimal, cleanInt, isValidDMY, maskDMY } from '../../repackingIssue/logic';
import { C, R, SP } from '../../repackingIssue/theme';
import { Banner, Btn, Card, Field, Input, Row, SelectBox, Stat } from '../../repackingIssue/components/ui';
import { OptionPicker } from '../../repacking/components/OptionPicker';
import {
  calcTax, DADD_MAX, emptyForm, fmt2, fmtQ, inwardRequired, REMARK_MAX, rowAmount, rowFromOutward, rowTotals, taxBase, txnTitle, validateForm, validateTax,
} from '../logic';
import { emptyJob, emptyJobIn, hasJobYarn, jobTotals, validateJob, validateJobIn } from '../job';
import { JobReturnCard } from './JobReturnCard';
import { JobYarnCard } from './JobYarnCard';
import { BEAM_INFO } from '../types';
import type { BeamContext, BeamForm, BeamLookup, BeamRights, BeamRow, BeamTxn, Opt, TaxLine } from '../types';
import { BeamPicker } from './BeamPicker';
import { BeamRowSheet } from './BeamRowSheet';
import { TaxSheet } from './TaxSheet';

import type { JobOut } from '../job';

export interface BeamInOutFormProps {
  ctx: BeamContext;
  txn: BeamTxn;
  service: BeamService;
  rights: BeamRights;
  mode?: 'add' | 'edit' | 'view';
  initialForm?: BeamForm;
  onSaved?: () => void;
  onCancel?: () => void;
  /** view mode: print the yarn job outward of this entry */
  onPrintJob?: (job: JobOut) => void;
}

const TITLES: Record<BeamLookup, string> = {
  account: 'Account',
  group: 'Group',
  entType: 'Entry Type',
  department: 'Department',
  authBy: 'Authorized By',
};

export function BeamInOutForm({ ctx, txn, service, rights, mode = 'add', initialForm, onSaved, onCancel, onPrintJob }: BeamInOutFormProps) {
  const { isPhone, isDesktop } = useDeviceClass();
  const [form, setForm] = useState<BeamForm>(() => initialForm ?? emptyForm(txn));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<BeamLookup | 'party' | null>(null);
  const [beamPick, setBeamPick] = useState(false);
  const [editing, setEditing] = useState<BeamRow | null>(null);
  const [taxOpen, setTaxOpen] = useState(false);
  const [taxNote, setTaxNote] = useState('');
  const [nextVou, setNextVou] = useState('');
  const [rateAll, setRateAll] = useState('');
  const [saving, setSaving] = useState(false);
  const [vouBusy, setVouBusy] = useState(false);
  const [showAllBeams, setShowAllBeams] = useState(false);
  /** Beam Inward: gate entry picker / loading its beams */
  const [gatePick, setGatePick] = useState(false);
  const [gateBusy, setGateBusy] = useState(false);
  const inwardTxn = txn === 'beam_inward';
  const vouRef = useRef<TextInput | null>(null);
  const sufRef = useRef<TextInput | null>(null);

  const gatePass = form.meta?.gatePassNo ?? '';
  const locked = (form.meta?.received ?? 0) > 0 || !!gatePass;
  const canWrite = mode === 'add' ? rights.add : mode === 'edit' ? rights.edit && !locked : false;
  const readOnly = !canWrite;
  const h = form.header;
  const totals = rowTotals(form.rows);
  const base = taxBase(form);
  const tax = useMemo(() => calcTax(base.gross, form.tax, form.sameState, base.noGst), [base.gross, base.noGst, form.tax, form.sameState]);
  const yarnOn = hasJobYarn(form.job);
  const yarn = jobTotals(form.job ?? emptyJob());
  /** whole voucher: beams (never GST) + yarn with its tax — or beams with the non-GST lines */
  const netAll = yarnOn ? Math.round((totals.gross + tax.net) * 100) / 100 : tax.net;
  const title = txnTitle(txn);

  /* ---- add: next voucher no. filled in (again when the date moves to another year), suffix BM ---- */
  useEffect(() => {
    if (mode !== 'add' || !isValidDMY(h.vouDate)) return;
    let alive = true;
    service.nextVoucher(ctx, h.vouDate)
      .then(v => {
        if (!alive || !v.no) return;
        setNextVou(v.no);
        setForm(f => (f.header.vouNo && !f.autoVouNo ? f : { ...f, autoVouNo: true, header: { ...f.header, vouNo: v.no } }));
        setErrors(e => { const n = { ...e }; delete n.vouNo; return n; });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [h.vouDate, ctx.prpCode, ctx.yearNo]); // eslint-disable-line react-hooks/exhaustive-deps

  /** typed Vou. No: pad to 8 digits and check it is free (same financial year, other vouchers) */
  const checkVoucher = async (no = h.vouNo, suffix = h.suffix, date = h.vouDate) => {
    if (form.autoVouNo && no === nextVou) return true; // our own next number — the server takes the next free one
    if (!no.trim() || Number(no) === 0) {
      setErrors(e => { const n = { ...e }; delete n.vouNo; return n; });
      if (no && Number(no) === 0) setHeader({ vouNo: '' });
      return true;
    }
    const padded = no.trim().padStart(8, '0');
    if (padded !== no) setForm(f => ({ ...f, header: { ...f.header, vouNo: padded } }));
    if (!isValidDMY(date)) return true;
    setVouBusy(true);
    try {
      const r = await service.checkVoucher(ctx, { vouNo: padded, suffix, vouDate: date, uid: form.meta?.uid ?? 0 });
      setForm(f => ({ ...f, header: { ...f.header, vouNo: r.no || padded } }));
      setErrors(e => {
        const n = { ...e };
        if (r.ok) delete n.vouNo; else n.vouNo = r.message;
        return n;
      });
      return r.ok;
    } catch {
      return true; // the server checks again on save
    } finally {
      setVouBusy(false);
    }
  };

  const setHeader = (p: Partial<BeamForm['header']>) => {
    setForm(f => ({ ...f, header: { ...f.header, ...p } }));
    setErrors(e => {
      const n = { ...e };
      Object.keys(p).forEach(k => delete n[k]);
      return n;
    });
  };

  /* ---- party → address, GST accounts; inward links belong to the old party ---- */
  const pickParty = async (o: Opt, force = false): Promise<boolean> => {
    setPicker(null);
    if (o.code === h.party?.code) return true;
    const inward = txn === 'beam_inward';
    const linked = form.rows.some(r => r.inward);
    if (!force && inward && form.rows.length && !(await confirmAsync('Change party?', 'The beams in this voucher went out to the old party and will be removed.', 'Change', true))) return false;
    if (!force && !inward && linked && !(await confirmAsync('Change party?', 'Inward No. of the beams belong to the old party and will be cleared.', 'Change', true))) return false;
    const addr = String(o.extra?.address ?? '');
    setForm(f => ({
      ...f,
      header: {
        ...f.header,
        party: o,
        address: addr,
        delAddress: !f.header.delAddress.trim() || f.header.delAddress === f.header.address ? addr.slice(0, DADD_MAX) : f.header.delAddress,
      },
      rows: inward ? [] : f.rows.map(r => ({ ...r, inward: null })),
      gate: inward ? null : f.gate,
    }));
    setErrors(e => { const n = { ...e }; delete n.party; delete n.delAddress; return n; });
    try {
      const r = await service.taxAccounts(ctx, txn, o.code);
      setForm(f => ({ ...f, taxAcc: r.taxAcc, sameState: r.sameState }));
      setTaxNote(r.sameState === null ? r.message || 'State of the property or the party is blank — all GST lines are open.' : '');
    } catch (e: any) {
      setTaxNote(e?.message || 'GST accounts could not be loaded.');
    }
    return true;
  };

  /* ---- Beam Inward: pick the Beam Gate Entry → its party and beams (linked to their outward lines) ---- */
  const pickGate = async (o: Opt) => {
    setGatePick(false);
    const gruid = Number(o.code) || 0;
    if (!gruid) return;
    setGateBusy(true);
    try {
      const r = await service.gateBeams(ctx, { gruid, uid: form.meta?.uid ?? 0 });
      if (!r.beams.length) return notify('Gate entry', r.message || 'All beams of this gate entry are already taken in.');
      if (h.party?.code !== r.gate.parCode) {
        if (form.rows.length && !(await confirmAsync('Change party?', `Gate entry ${r.gate.no} is of ${r.gate.party}. The beams in this voucher will be replaced.`, 'Continue', true))) return;
        const found = (await service.parties(ctx, txn, r.gate.parCode).catch(() => [] as Opt[])).find(p => p.code === r.gate.parCode);
        await pickParty(found ?? { code: r.gate.parCode, name: r.gate.party }, true);
      }
      setForm(f => ({
        ...f,
        gate: { uid: r.gate.uid, no: r.gate.no, date: r.gate.date, vehNo: r.gate.vehNo },
        // our beams come from the gate entry; party beams (Process House) stay
        rows: [...f.rows.filter(x => x.inward?.tranType !== -10), ...r.beams.map(rowFromOutward)],
      }));
      setErrors(e => { const n = { ...e }; delete n.rows; delete n.gate; return n; });
    } catch (e: any) {
      notify('Gate entry', e?.message || 'Could not load the gate entry.');
    } finally {
      setGateBusy(false);
    }
  };

  /* ---- entry type → tax structure (keeps what was typed on the same tax code) ---- */
  const pickMaster = async (kind: BeamLookup, o: Opt) => {
    setPicker(null);
    setHeader({ [kind]: o } as Partial<BeamForm['header']>);
    if (kind !== 'entType' || o.code === h.entType?.code) return;
    try {
      const lines = await service.taxLines(ctx, txn, o);
      setForm(f => ({
        ...f,
        tax: lines.map(l => {
          const old = f.tax.find(t => t.taxCode === l.taxCode && t.taxName === l.taxName);
          return old ? { ...l, per: old.per, amt: old.amt, manual: old.manual } : l;
        }),
      }));
    } catch (e: any) {
      notify('Tax Detail', e?.message || 'The tax lines of this entry type could not be loaded.');
    }
  };

  /* ---- beams ---- */
  const addBeams = (list: BeamRow[]) => {
    setBeamPick(false);
    setForm(f => ({ ...f, rows: [...f.rows, ...list] }));
    setErrors(e => { const n = { ...e }; delete n.rows; return n; });
  };
  const saveRow = (r: BeamRow) => {
    setForm(f => ({ ...f, rows: f.rows.map(x => (x.key === r.key ? r : x)) }));
    setErrors(e => { const n = { ...e }; Object.keys(n).filter(k => k.startsWith('row')).forEach(k => delete n[k]); return n; });
    setEditing(null);
  };
  const removeRow = async (r: BeamRow) => {
    if (!(await confirmAsync('Remove beam?', `Beam ${r.beamNo} will be removed from this voucher.`, 'Remove', true))) return;
    setForm(f => ({ ...f, rows: f.rows.filter(x => x.key !== r.key) }));
    setEditing(null);
  };
  const applyRateAll = () => {
    if (!rateAll.trim()) return;
    setForm(f => ({ ...f, rows: f.rows.map(r => ({ ...r, rate: rateAll })) }));
  };

  /* ---- save ---- */
  const save = async () => {
    if (!(await checkVoucher())) return notify('Voucher No', 'This voucher no. is already used — change it or leave it blank for the next number.');
    const e = validateForm(form);
    if (inwardTxn && !form.gate && !rights.withoutGate && mode === 'add' && form.rows.some(r => r.inward?.tranType === -10)) {
      e.gate = 'Pick the gate entry - beams coming back against a Beam Outward are taken in from the Beam Gate Entry.';
    }
    const t = validateTax(form.tax, form.sameState);
    if (t) e.tax = t;
    const j = inwardTxn ? validateJobIn(form.jobIn, form.rows) : validateJob(form.job);
    if (j) e.job = j;
    setErrors(e);
    if (Object.keys(e).length) return notify('Check entry', Object.values(e).slice(0, 5).join('\n'));
    if (netAll <= 0 && !(await confirmAsync('Net amount is 0', 'Save the voucher with a 0 net amount?', 'Save', false))) return;
    setSaving(true);
    try {
      const r = await service.save(ctx, { ...form, withoutGate: inwardTxn && !!rights.withoutGate });
      if (!r.ok) return notify('Not saved', r.message);
      notify('Saved', r.message);
      if (onSaved) onSaved();
      else setForm(emptyForm(txn));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!readOnly && form.rows.length && !(await confirmAsync('Discard entry?', 'Changes will be lost.', 'Discard', true))) return;
    onCancel?.();
  };

  /* ---- render ---- */
  const voucherCard = (
    <Card step={1} title="Voucher & Party">
      <Row>
        <Field label="Vou. Date" required error={errors.vouDate}>
          <Input value={h.vouDate} onChangeText={t => setHeader({ vouDate: maskDMY(t) })} onSubmitEditing={() => vouRef.current?.focus()} blurOnSubmit={false} returnKeyType="next" keyboardType="number-pad" placeholder="dd-mm-yyyy" maxLength={10} editable={!readOnly} invalid={!!errors.vouDate} />
        </Field>
        <Field label="Vou. No" error={errors.vouNo} hint={vouBusy ? 'Checking…' : mode === 'add' ? (form.autoVouNo ? 'Next number' : !h.vouNo ? 'Blank = next number' : undefined) : undefined}>
          <Input
            value={h.vouNo}
            onChangeText={t => { setForm(f => ({ ...f, autoVouNo: false })); setHeader({ vouNo: cleanInt(t).slice(0, 8) }); }}
            onBlur={() => { if (!readOnly) checkVoucher(); }}
            ref={vouRef}
            onSubmitEditing={() => { if (!readOnly) checkVoucher(); sufRef.current?.focus(); }}
            blurOnSubmit={false}
            returnKeyType="next"
            keyboardType="number-pad"
            placeholder={nextVou || 'Next'}
            editable={!readOnly}
            invalid={!!errors.vouNo}
            maxLength={8}
            style={{ fontVariant: ['tabular-nums'] }}
          />
        </Field>
        <Field label="Suffix" style={{ maxWidth: 110 }}>
          <Input ref={sufRef} onSubmitEditing={() => { if (!readOnly && !h.party) setPicker('party'); }} returnKeyType="next" value={h.suffix} onChangeText={t => setHeader({ suffix: t.toUpperCase().slice(0, 4) })} onBlur={() => { if (!readOnly && h.vouNo && !form.autoVouNo) checkVoucher(); }} autoCapitalize="characters" editable={!readOnly} />
        </Field>
      </Row>
      <Field label="Party Name" required error={errors.party}>
        <SelectBox icon="business" value={h.party?.name} code={h.party?.code} placeholder="Select party" onPress={() => setPicker('party')} invalid={!!errors.party} disabled={readOnly} />
      </Field>
      {h.address ? <Text style={st.addr} numberOfLines={3}>{h.address}</Text> : null}
      <Field label="Delivery Address" required error={errors.delAddress} hint={`${h.delAddress.length}/${DADD_MAX}`}>
        <Input value={h.delAddress} onChangeText={t => setHeader({ delAddress: t })} maxLength={DADD_MAX} multiline editable={!readOnly} invalid={!!errors.delAddress} style={{ minHeight: 64, textAlignVertical: 'top', paddingTop: 10 }} />
      </Field>
    </Card>
  );

  const accountsCard = (
    <Card step={4} title="Accounts">
      <Field label="Account" required error={errors.account}>
        <SelectBox icon="account-balance" value={h.account?.name} code={h.account?.code} placeholder="Select account" onPress={() => setPicker('account')} invalid={!!errors.account} disabled={readOnly} />
      </Field>
      <Row>
        <Field label="Group" required error={errors.group}>
          <SelectBox value={h.group?.name} placeholder="Select group" onPress={() => setPicker('group')} invalid={!!errors.group} disabled={readOnly} />
        </Field>
        <Field label="Entry Type" required error={errors.entType} hint={form.tax.length ? `${form.tax.length} tax lines` : undefined}>
          <SelectBox value={h.entType?.name} placeholder="Select type" onPress={() => setPicker('entType')} invalid={!!errors.entType} disabled={readOnly} />
        </Field>
      </Row>
      <Row>
        <Field label="Department" required error={errors.department}>
          <SelectBox value={h.department?.name} placeholder="Select department" onPress={() => setPicker('department')} invalid={!!errors.department} disabled={readOnly} />
        </Field>
        <Field label="Authorized By">
          <SelectBox value={h.authBy?.name} placeholder="Select" onPress={() => setPicker('authBy')} disabled={readOnly} />
        </Field>
      </Row>
    </Card>
  );

  const beamRows = form.rows.map((r, i) => {
    const err = errors[`row${i}`];
    const missing = inwardRequired(txn, r) && !r.inward;
    const info = BEAM_INFO.find(b => b.value === r.info)?.label ?? '';
    if (isPhone) {
      return (
        <Pressable key={r.key} onPress={() => setEditing(r)} style={[st.beamCard, !!err && { borderColor: C.danger }]} accessibilityRole="button">
          <View style={st.beamTop}>
            <Text style={st.sr}>{i + 1}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.beamNo}>{r.beamNo}</Text>
              <Text style={st.meta} numberOfLines={1}>{r.beamName}  •  {info}{r.inward ? `  •  ${r.inward.no}` : ''}</Text>
            </View>
            <Text style={st.amt}>{fmt2(rowAmount(r))}</Text>
          </View>
          <Text style={st.meta}>Qty {fmtQ(Number(r.qty) || 0)}  ×  {r.rate ? fmt2(Number(r.rate)) : '—'}  •  Wt {r.weight}</Text>
          {err || missing ? <Text style={st.rowErr}>{err ?? 'Select the Inward No.'}</Text> : null}
        </Pressable>
      );
    }
    return (
      <Pressable key={r.key} onPress={() => setEditing(r)} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.tr, i % 2 === 1 && { backgroundColor: C.quiet }, hovered && { backgroundColor: C.ctaSoft }, pressed && { opacity: 0.85 }]} accessibilityRole="button">
        <Text style={[st.td, st.cSr]}>{i + 1}</Text>
        <View style={[st.cBeam]}>
          <Text style={st.beamNo}>{r.beamNo}</Text>
          <Text style={st.meta} numberOfLines={1}>{r.beamName}</Text>
          {err || missing ? <Text style={st.rowErr} numberOfLines={1}>{err ?? 'Select the Inward No.'}</Text> : null}
        </View>
        <Text style={[st.td, st.cNum]}>{r.weight || '—'}</Text>
        <Text style={[st.td, st.cNum]}>{fmtQ(Number(r.qty) || 0)}</Text>
        <Text style={[st.td, st.cNum]}>{r.rate ? fmt2(Number(r.rate)) : '—'}</Text>
        <Text style={[st.td, st.cNum, { fontWeight: '800', color: C.nav }]}>{fmt2(rowAmount(r))}</Text>
        <Text style={[st.td, st.cInfo]}>{info}</Text>
        <Text style={[st.td, st.cInw]} numberOfLines={1}>{r.inward ? `${r.inward.no}\n${r.inward.date}` : '—'}</Text>
        <Icon name="chevron-right" size={20} color={C.muted} />
      </Pressable>
    );
  });

  const beamsCard = (
    <Card step={2} title={`Beams (${form.rows.length})`} right={!readOnly && rights.beams ? (
      inwardTxn ? (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Btn small icon="login" title={form.gate ? 'Change gate entry' : 'From gate entry'} loading={gateBusy} onPress={() => setGatePick(true)} />
          <Btn small kind="ghost" icon="playlist-add" title={rights.withoutGate ? 'Add beams' : 'Party beams'} onPress={() => (h.party ? setBeamPick(true) : notify('Party', 'Select the party first.'))} />
        </View>
      ) : (
        <Btn small icon="playlist-add" title="Add beams" onPress={() => (h.party ? setBeamPick(true) : notify('Party', 'Select the party first.'))} />
      )
    ) : null}>
      {errors.rows ? <Text style={st.err}>{errors.rows}</Text> : null}
      {errors.gate ? <Text style={st.err}>{errors.gate}</Text> : null}
      {inwardTxn && form.gate ? (
        <View style={st.gate}>
          <Icon name="login" size={20} color={C.cta} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.gateNo}>Gate entry {form.gate.no}</Text>
            <Text style={st.gateMeta} numberOfLines={1}>{[form.gate.date, form.gate.vehNo].filter(Boolean).join('  •  ') || 'Beams below came in on this gate entry'}</Text>
          </View>
        </View>
      ) : inwardTxn && mode === 'edit' && form.rows.some(r => r.inward?.tranType === -10) ? (
        <Text style={st.gateMeta}>Taken in without a gate entry (entered before the Beam Gate Entry).</Text>
      ) : null}
      {!form.rows.length && inwardTxn ? (
        <Pressable onPress={!readOnly && rights.beams ? () => setGatePick(true) : undefined} style={st.empty} accessibilityRole="button">
          <Icon name="login" size={30} color={C.cta} />
          <Text style={st.emptyTxt}>Pick the gate entry</Text>
          <Text style={st.emptyHint}>
            {rights.withoutGate
              ? 'Security makes a Beam Gate Entry when the beams come in — pick it here. No gate entry? “Add beams” (you have the right to take beams in without one).'
              : 'Security makes a Beam Gate Entry when the beams come in. Pick it here and the party and beams fill in. Process House beams: “Party beams”.'}
          </Text>
        </Pressable>
      ) : !form.rows.length ? (
        <Pressable onPress={!readOnly && rights.beams ? () => (h.party ? setBeamPick(true) : notify('Party', 'Select the party first.')) : undefined} style={st.empty} accessibilityRole="button">
          <Icon name="view-week" size={30} color={C.cta} />
          <Text style={st.emptyTxt}>Add beams</Text>
          <Text style={st.emptyHint}>{txn === 'beam_outward' ? 'Pick the beams going out — several at once' : 'Only the beams out at this party are listed — tick the ones that came back'}</Text>
        </Pressable>
      ) : (
        <>
          {!readOnly && rights.beams && form.rows.length > 1 ? (
            <View style={st.bulk}>
              <Text style={st.bulkTxt}>Rate for all beams</Text>
              <View style={{ width: 130 }}>
                <Input value={rateAll} onChangeText={t => setRateAll(cleanDecimal(t, 2))} keyboardType="decimal-pad" placeholder="0.00" style={{ textAlign: 'right' }} onSubmitEditing={applyRateAll} />
              </View>
              <Btn small kind="dark" icon="done-all" title="Apply" onPress={applyRateAll} />
            </View>
          ) : null}
          {isPhone ? (
            <>
              {showAllBeams ? beamRows : beamRows.slice(0, PHONE_BEAMS)}
              {beamRows.length > PHONE_BEAMS ? (
                <Btn
                  small
                  kind="ghost"
                  icon={showAllBeams ? 'expand-less' : 'expand-more'}
                  title={showAllBeams ? 'Show less' : `Show all ${beamRows.length} beams`}
                  onPress={() => setShowAllBeams(v => !v)}
                  style={{ alignSelf: 'center' }}
                />
              ) : null}
              <View style={st.phoneTot}>
                <Text style={st.tfTxt}>{totals.beams} beam{totals.beams === 1 ? '' : 's'}</Text>
                <Text style={st.tfTxt}>Wt {fmtQ(totals.weight)}  •  Qty {fmtQ(totals.qty)}</Text>
                <Text style={st.tfTxt}>{fmt2(totals.gross)}</Text>
              </View>
            </>
          ) : (
            <View style={st.table}>
              <View style={[st.tr, st.th]}>
                <Text style={[st.thTxt, st.cSr]}>#</Text>
                <Text style={[st.thTxt, st.cBeam]}>Beam</Text>
                <Text style={[st.thTxt, st.cNum]}>Weight</Text>
                <Text style={[st.thTxt, st.cNum]}>Qty</Text>
                <Text style={[st.thTxt, st.cNum]}>Rate</Text>
                <Text style={[st.thTxt, st.cNum]}>Amount</Text>
                <Text style={[st.thTxt, st.cInfo]}>Beam Info</Text>
                <Text style={[st.thTxt, st.cInw]}>Inward</Text>
                <View style={{ width: 20 }} />
              </View>
              <ScrollView style={{ maxHeight: TABLE_BODY_MAX }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {beamRows}
              </ScrollView>
              <View style={[st.tr, st.tf]}>
                <Text style={[st.tfTxt, st.cSr]} />
                <Text style={[st.tfTxt, st.cBeam]}>{totals.beams} beam{totals.beams === 1 ? '' : 's'}</Text>
                <Text style={[st.tfTxt, st.cNum]}>{fmtQ(totals.weight)}</Text>
                <Text style={[st.tfTxt, st.cNum]}>{fmtQ(totals.qty)}</Text>
                <Text style={[st.tfTxt, st.cNum]} />
                <Text style={[st.tfTxt, st.cNum]}>{fmt2(totals.gross)}</Text>
                <Text style={[st.tfTxt, st.cInfo]} />
                <Text style={[st.tfTxt, st.cInw]} />
                <View style={{ width: 20 }} />
              </View>
            </View>
          )}
        </>
      )}
    </Card>
  );

  const amountCard = (
    <Card step={5} title="Amount">
      <View style={st.amtGrid}>
        <Stat label="Beams" value={fmt2(totals.gross)} />
        {yarnOn ? <Stat label="Yarn" value={fmt2(yarn.gross)} /> : null}
        <Stat label="Less" value={fmt2(tax.less)} />
        <Stat label={yarnOn ? 'GST (yarn)' : 'GST'} value={fmt2(tax.gst)} />
        <Stat label="Net Amount" value={fmt2(netAll)} strong />
      </View>
      {!yarnOn ? <Text style={st.meta}>Empty beams carry no GST.</Text> : null}
      <Pressable
        onPress={() => (form.tax.length ? setTaxOpen(true) : notify('Tax Detail', 'Select the Entry Type first — its tax lines are loaded from it.'))}
        style={[st.taxBtn, !!errors.tax && { borderColor: C.danger }]}
        accessibilityRole="button">
        <Icon name="receipt" size={20} color={C.cta} />
        <View style={{ flex: 1 }}>
          <Text style={st.taxTitle}>Tax Detail</Text>
          <Text style={st.meta} numberOfLines={1}>
            {form.tax.length
              ? tax.lines.filter(l => l.amount).map(l => `${l.taxName} ${fmt2(l.signed)}`).join('  •  ') || 'No tax entered'
              : 'Select the Entry Type'}
          </Text>
          {errors.tax ? <Text style={st.rowErr}>{errors.tax}</Text> : null}
        </View>
        <Icon name="chevron-right" size={22} color={C.muted} />
      </Pressable>
      <Field label="Remark" hint={`${h.remark.length}/${REMARK_MAX}`} error={errors.remark}>
        <Input value={h.remark} onChangeText={t => setHeader({ remark: t })} maxLength={REMARK_MAX} editable={!readOnly} placeholder="Remark" />
      </Field>
    </Card>
  );

  const jobCard = inwardTxn ? (
    <JobReturnCard step={3} ctx={ctx} service={service} uid={form.meta?.uid ?? 0} parCode={h.party?.code ?? ''} rows={form.rows}
      jobIn={form.jobIn ?? emptyJobIn()} readOnly={readOnly || !rights.jobYarn} error={errors.job}
      onChange={ji => { setForm(f => ({ ...f, jobIn: ji })); setErrors(e => { const n = { ...e }; delete n.job; return n; }); }} />
  ) : (
    <JobYarnCard onPrint={mode === 'view' && onPrintJob ? onPrintJob : undefined} step={3} ctx={ctx} service={service} uid={form.meta?.uid ?? 0} job={form.job ?? emptyJob()} readOnly={readOnly || !rights.jobYarn} error={errors.job}
      taxLines={form.tax} sameState={form.sameState}
      onChange={j => { setForm(f => ({ ...f, job: j })); setErrors(e => { const n = { ...e }; delete n.job; return n; }); }} />
  );

  const wrap = { width: '100%' as const, maxWidth: 1280, alignSelf: 'center' as const };

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: SP.md, paddingBottom: SP.xl }} keyboardShouldPersistTaps="handled">
        <View style={wrap}>
          <View style={st.ctx}>
            <Icon name="view-week" size={16} color={C.cta} />
            <Text style={st.ctxTxt} numberOfLines={1}>{title}  •  {ctx.prpName}  •  {ctx.yearLabel}</Text>
            <View style={st.modeChip}><Text style={st.modeTxt}>{mode.toUpperCase()}</Text></View>
          </View>
          {mode !== 'add' && locked ? (
            <Banner text={gatePass ? `Gate pass ${gatePass} is made for this voucher — delete the gate pass to change it.` : "Beams of this voucher are already received back — it can't be changed or deleted."} />
          ) : mode !== 'view' && readOnly ? (
            <Banner text={`View only — you don't have ${mode} permission for ${title}.`} />
          ) : null}
          {isDesktop ? (
            <View style={{ flexDirection: 'row', gap: SP.md, alignItems: 'flex-start' }}>
              <View style={{ width: 420 }}>{voucherCard}{accountsCard}</View>
              <View style={{ flex: 1, minWidth: 0 }}>{beamsCard}{jobCard}{amountCard}</View>
            </View>
          ) : (
            <>
              {voucherCard}
              {beamsCard}
              {jobCard}
              {accountsCard}
              {amountCard}
            </>
          )}
        </View>
      </ScrollView>

      <View style={st.footer}>
        <View style={[wrap, !isPhone ? st.footerRow : { gap: SP.sm }]}>
          <View style={[st.totals, !isPhone && { flex: 1 }]}>
            <Stat label="Beams" value={String(totals.beams)} />
            <Stat label="Qty" value={fmtQ(totals.qty)} />
            {yarnOn ? <Stat label="Yarn kg" value={fmtQ(yarn.qty)} /> : null}
            <Stat label="Net Amount" value={fmt2(netAll)} strong />
          </View>
          <View style={[{ flexDirection: 'row', gap: SP.sm }, !isPhone && { width: 340 }]}>
            <Btn kind="ghost" title={readOnly ? 'Close' : 'Cancel'} onPress={cancel} style={{ flex: 1 }} />
            {!readOnly ? <Btn title={mode === 'edit' ? 'Update' : 'Save'} icon="save" onPress={save} loading={saving} style={{ flex: 2 }} /> : null}
          </View>
        </View>
      </View>

      <BeamPicker
        visible={beamPick}
        ctx={ctx}
        txn={txn}
        service={service}
        uid={form.meta?.uid ?? 0}
        parCode={h.party?.code ?? ''}
        rows={form.rows}
        onPick={addBeams}
        onClose={() => setBeamPick(false)}
        partyOnly={inwardTxn && !rights.withoutGate}
      />
      {inwardTxn ? (
        <OptionPicker
          visible={gatePick}
          title="Gate Entry"
          search={(q: string) => service.gateEntries(ctx, { parCode: h.party?.code ?? '', search: q })}
          selected={form.gate ? String(form.gate.uid) : undefined}
          sub={(o: Opt) => {
            const x = (o.extra ?? {}) as Record<string, any>;
            return [x.date, `${x.openBeams} beam${x.openBeams === 1 ? '' : 's'}${x.beamNos ? `: ${x.beamNos}` : ''}`, x.outNo && `Outward ${x.outNo}`, x.vehNo].filter(Boolean).join('  •  ');
          }}
          onPick={pickGate}
          onClose={() => setGatePick(false)}
        />
      ) : null}
      {editing ? (
        <BeamRowSheet
          visible
          ctx={ctx}
          txn={txn}
          service={service}
          parCode={h.party?.code ?? ''}
          initial={editing}
          readOnly={readOnly || !rights.beams}
          canRemove={rights.removeBeam}
          onSave={saveRow}
          onRemove={() => removeRow(editing)}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <TaxSheet
        visible={taxOpen}
        gross={base.gross}
        noGst={base.noGst}
        lines={form.tax}
        sameState={form.sameState}
        taxAccNote={taxNote}
        readOnly={readOnly || !rights.tax}
        onApply={(lines: TaxLine[]) => { setForm(f => ({ ...f, tax: lines })); setErrors(e => { const n = { ...e }; delete n.tax; return n; }); setTaxOpen(false); }}
        onClose={() => setTaxOpen(false)}
      />
      <OptionPicker
        visible={picker === 'party'}
        title="Party"
        search={(q: string) => service.parties(ctx, txn, q)}
        selected={h.party?.code}
        onPick={pickParty}
        onClose={() => setPicker(null)}
      />
      {picker && picker !== 'party' ? (
        <OptionPicker
          visible
          title={TITLES[picker]}
          options={undefined}
          search={async (q: string) => {
            const list = await service.master(picker, ctx, txn);
            const s = q.trim().toUpperCase();
            return s ? list.filter(o => o.name.toUpperCase().includes(s) || o.code.toUpperCase().includes(s)) : list;
          }}
          selected={(h[picker] as Opt | null)?.code}
          onPick={o => pickMaster(picker, o)}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** beam table body: about 5 rows, then it scrolls (header and totals stay) */
const TABLE_BODY_MAX = 5 * 53 + 4;
/** phone: beams shown before "Show all" */
const PHONE_BEAMS = 4;

const st = StyleSheet.create({
  gate: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, padding: SP.sm, borderRadius: R.md, backgroundColor: C.ctaSoft, borderWidth: 1, borderColor: C.cta, marginBottom: SP.sm },
  gateNo: { fontSize: 15, fontWeight: '800', color: C.nav },
  gateMeta: { fontSize: 12, color: C.muted },
  root: { flex: 1, backgroundColor: C.bg },
  ctx: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.xs, marginBottom: SP.md },
  ctxTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: C.nav },
  modeChip: { backgroundColor: C.nav, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  modeTxt: { fontSize: 11, fontWeight: '800', color: C.onNav, letterSpacing: 0.8 },
  addr: { fontSize: 12, color: C.muted, marginTop: -SP.sm, marginBottom: SP.md, paddingHorizontal: SP.xs },
  err: { color: C.danger, fontSize: 12, fontWeight: '700', marginBottom: SP.sm },
  empty: { alignItems: 'center', paddingVertical: SP.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, borderRadius: R.md, gap: 2 },
  emptyTxt: { fontSize: 15, fontWeight: '800', color: C.nav, marginTop: 4 },
  emptyHint: { fontSize: 12, color: C.muted, marginTop: 2, textAlign: 'center' },
  bulk: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.md },
  bulkTxt: { fontSize: 13, fontWeight: '700', color: C.nav },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.md, paddingVertical: 8, borderBottomWidth: 1, borderColor: C.hair },
  th: { backgroundColor: C.nav, borderBottomWidth: 0 },
  thTxt: { color: C.onNav, fontSize: 12, fontWeight: '800' },
  tf: { backgroundColor: C.ctaSoft, borderBottomWidth: 0, borderTopWidth: 1, borderColor: C.line },
  phoneTot: { flexDirection: 'row', justifyContent: 'space-between', gap: SP.sm, padding: SP.sm, marginTop: SP.sm, borderRadius: R.sm, backgroundColor: C.ctaSoft },
  tfTxt: { fontSize: 13, fontWeight: '800', color: C.cta, fontVariant: ['tabular-nums'] },
  td: { fontSize: 13, color: C.ink, fontVariant: ['tabular-nums'] },
  cSr: { width: 24 },
  cBeam: { flex: 1.4, minWidth: 0 },
  cNum: { width: 92, textAlign: 'right' },
  cInfo: { width: 104 },
  cInw: { width: 110, fontSize: 12 },
  beamNo: { fontSize: 15, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'] },
  meta: { fontSize: 12, color: C.muted, marginTop: 2 },
  rowErr: { fontSize: 12, color: C.danger, fontWeight: '700', marginTop: 2 },
  beamCard: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: SP.md, marginBottom: SP.sm, backgroundColor: C.card },
  beamTop: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  sr: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.track, textAlign: 'center', lineHeight: 24, fontSize: 12, fontWeight: '800', color: C.nav, overflow: 'hidden' },
  amt: { fontSize: 15, fontWeight: '800', color: C.cta, fontVariant: ['tabular-nums'] },
  amtGrid: { flexDirection: 'row', marginBottom: SP.md, paddingBottom: SP.sm, borderBottomWidth: 1, borderColor: C.hair },
  taxBtn: { flexDirection: 'row', alignItems: 'center', gap: SP.md, padding: SP.md, borderWidth: 1, borderColor: C.line, borderRadius: R.md, marginBottom: SP.md, backgroundColor: C.card },
  taxTitle: { fontSize: 14, fontWeight: '800', color: C.nav },
  footer: { padding: SP.md, backgroundColor: C.card, borderTopWidth: 1, borderColor: C.line },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: SP.lg },
  totals: { flexDirection: 'row' },
});
