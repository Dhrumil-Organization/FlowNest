// FILE: src/components/SalesChallanPackingSlipNEW/SlipStep.tsx
// Step 1 — facility · date & packing no. · party · pending orders · stock filter.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ErrorText, LinkBtn, Notice, PickerField, Section, TextField, tab, u } from '../PackingAutomationNEW/ui';
import type { Ctx, Row } from './api';
import PartyField from './PartyField';
import { isDate, maskDate, pick, qty, splitTypes } from './rules';
import { Sr, Tag, Tags } from './ui';

export default function SlipStep({
  f, ctx, facility, onFacility, facilityLocked, headerLocked, meta, busy, problem, actions, onOpenOrders, onOpenTypes, onPartyChosen, confirmPartyChange, dateError, setDateError,
}: {
  f: Row; ctx: Ctx; facility: string; onFacility: () => void; facilityLocked: boolean; headerLocked: boolean;
  meta: { prpType: string; strDesc: string };
  busy: Record<string, boolean | undefined>; problem: Record<string, string | undefined>;
  actions: any; onOpenOrders: () => void; onOpenTypes: () => void; onPartyChosen: () => void; confirmPartyChange: () => Promise<boolean>;
  dateError?: string; setDateError: (e?: string) => void;
}) {
  const d1: Row[] = f.d1 || [];
  const types = splitTypes(f.ProdTtype);
  const commitDate = () => {
    if (!isDate(f.ChalDate)) { setDateError('Use DD-MM-YYYY.'); return; }
    setDateError(undefined);
    actions.checkVoucher({ date: f.ChalDate });
  };

  return (
    <>
      <Section title="Facility">
        <PickerField label="" icon="business" value={facility || undefined} placeholder="Choose facility"
          sub={ctx.prpcode ? `FY ${ctx.yearno || '—'} · Store ${ctx.strcode || '—'}` : undefined}
          locked={facilityLocked} onPress={onFacility} />
      </Section>

      <Section title="Packing slip">
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <TextField label="Packing date" required numeric value={f.ChalDate || ''} placeholder="DD-MM-YYYY"
            onChangeText={(v) => { setDateError(undefined); actions.set('ChalDate', maskDate(v)); if (maskDate(v).length === 10 && isDate(maskDate(v))) actions.checkVoucher({ date: maskDate(v) }); }}
            onSubmitEditing={commitDate} editable={!headerLocked} error={dateError} style={{ flex: 1.2, minWidth: 150 }} />
          <View style={{ flex: 1.5, minWidth: 170, flexDirection: 'row', gap: 8 }}>
            <TextField label="Packing no." required numeric value={String(f.ChalNo ?? '')} editable={!headerLocked}
              onChangeText={(v) => actions.set('ChalNo', v.replace(/[^0-9]/g, '').slice(0, 8))} style={{ flex: 1.5 }} />
            <TextField label="Suffix" value={String(f.suffix ?? '')} editable={!headerLocked} placeholder="—"
              onChangeText={(v) => actions.set('suffix', v.trim().toUpperCase().slice(0, 4))}
              onSubmitEditing={() => actions.checkVoucher({ suffix: String(f.suffix ?? '') })} style={{ flex: 1 }} />
          </View>
        </View>
        {busy.voucher ? <Text style={u.hint}>Checking packing number…</Text> : <ErrorText>{problem.voucher}</ErrorText>}
      </Section>

      <Section title="Party">
        <PartyField f={f} locked={headerLocked} busy={busy.party} error={problem.party}
          search={actions.searchParties} needsConfirm={confirmPartyChange}
          onChoose={async (code) => {
            const ok = await actions.chooseParty(code);
            if (ok) onPartyChosen();
            return ok;
          }}
          onClear={actions.clearParty} />
      </Section>

      <Section title={`Orders · ${d1.length}`}
        right={!headerLocked && pick(f, 'ParCode') ? <LinkBtn label="Add orders" icon="playlist-add" onPress={onOpenOrders} /> : undefined}>
        {!pick(f, 'ParCode') ? (
          <Notice tone="info" text="Choose the party first. Its pending orders open right after." />
        ) : d1.length === 0 ? (
          <TouchableOpacity onPress={onOpenOrders} disabled={headerLocked} accessibilityRole="button"
            style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: T.border, borderRadius: 12, paddingVertical: 18, alignItems: 'center', gap: 6 }}>
            <Icon name="playlist-add" size={26} color={T.copper} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: T.ink }}>Pick pending orders</Text>
            <Text style={u.hint}>Tick the order lines to pack on this slip.</Text>
          </TouchableOpacity>
        ) : (
          d1.map((r, i) => (
            <View key={`${r.SrNo}-${r.SOUId}-${r.ItmCode}`} style={[{ flexDirection: 'row', gap: 12, paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: T.alt }]}>
              <Sr n={r.SrNo} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[{ fontSize: 13, fontWeight: '800', color: T.copper }, tab]}>SO {r.SONo}</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: T.ink, marginTop: 1 }}>{r.ItmName}</Text>
                <Tags>
                  {r.ShdName ? <Tag text={r.ShdName} /> : null}
                  {r.GrdName ? <Tag text={`Grade ${r.GrdName}`} /> : null}
                  {meta.prpType === 'S' && meta.strDesc === 'G' && r.DsnName ? <Tag text={r.DsnName} /> : null}
                </Tags>
              </View>
              <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <Text style={[{ fontSize: 15.5, fontWeight: '800', color: T.ink }, tab]}>{qty(r.BQty)}</Text>
                {!headerLocked ? (
                  <TouchableOpacity onPress={() => actions.removeOrder(r.SrNo)} accessibilityRole="button" accessibilityLabel={`Remove line ${r.SrNo}`} hitSlop={10}>
                    <Icon name="close" size={20} color={T.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
        )}
      </Section>

      <Section title="Stock filter">
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <PickerField label="Production type" icon="tune" value={types.length ? types.join(', ') : undefined} placeholder="All types"
            locked={headerLocked} onPress={onOpenTypes} hint="Optional" style={{ flex: 2, minWidth: 180 }} />
          <TextField label="Chees" numeric value={String(f.chees ?? '')} placeholder="Any" editable={!headerLocked}
            onChangeText={(v) => actions.set('chees', v.replace(/[^0-9]/g, '').slice(0, 8))} hint="Optional" style={{ flex: 1, minWidth: 110 }} />
        </View>
      </Section>
    </>
  );
}
