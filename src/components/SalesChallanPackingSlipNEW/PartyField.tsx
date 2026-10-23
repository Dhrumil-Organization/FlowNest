// FILE: src/components/SalesChallanPackingSlipNEW/PartyField.tsx
// Party — React Native version of AllPartyDataSCPS as this screen uses it
// (hasDueDay = 1, IsPendingOrder = 1, txntype sales_challan_packing_slip):
//
//   1 the help list (web "?" PartySelect dialog) → accountbasic, searched on the server
//   2 pick → accountget → the form gets ParCode, ParName, address, broker, GSTIN, PanNo, DueDay …
//   3 GSTIN blank → "Party GSTIN cannot be blank." and the party is cleared (web clearBoxDueDay)
//   4 getlimit → credit limit merged into the form
//   5 pending orders open by themselves (property type R/U/I/T/S/K, store ≠ 0)
// A different party clears the order lines, stock and cartons, like the web.
import { T } from '@/src/theme';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ServerPicker } from '../ProductionOrderNEW/ui';
import { LinkBtn, PickerField, tab, u } from '../PackingAutomationNEW/ui';
import type { Row } from './api';
import { partyRowView, pick } from './rules';

export default function PartyField({
  f, locked, busy, error, search, onChoose, onClear, needsConfirm,
}: {
  f: Row; locked?: boolean; busy?: boolean; error?: string;
  search: (q: string, page: number) => Promise<{ rows: Row[]; more: boolean }>;
  /** acccode → resolves true when the party was set. */
  onChoose: (acccode: string) => Promise<boolean> | boolean;
  onClear: () => void;
  /** Asks before replacing a party that already has order lines. */
  needsConfirm: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const has = !!pick(f, 'ParCode');
  const sub = has ? [pick(f, 'ParCode'), pick(f, 'DCity', 'city'), pick(f, 'GSTIN')].filter(Boolean).join(' · ') : undefined;

  return (
    <View>
      <PickerField
        label="Party"
        required
        icon="search"
        value={has ? pick(f, 'ParName') || `Party ${pick(f, 'ParCode')}` : undefined}
        sub={sub}
        placeholder="Search party name, code, city or GSTIN"
        locked={locked}
        loading={busy}
        error={error}
        onPress={() => setOpen(true)}
      />
      {has && !locked ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: -2 }}>
          <LinkBtn label="Clear party" icon="close" onPress={onClear} />
        </View>
      ) : null}
      {has && (pick(f, 'BAccName') || pick(f, 'DAdd')) ? (
        <View style={{ backgroundColor: T.sub, borderRadius: 12, padding: 12, marginTop: 6, gap: 4 }}>
          {pick(f, 'DAdd') ? (
            <Text style={{ fontSize: 13, color: T.ink, fontWeight: '600' }}>
              {[pick(f, 'DAdd'), pick(f, 'DCity'), pick(f, 'DState'), pick(f, 'DZip')].filter(Boolean).join(', ')}
            </Text>
          ) : null}
          {pick(f, 'BAccName') ? <Text style={[u.code, tab]}>Broker {pick(f, 'BAccName')}{pick(f, 'BAccCode') ? `  ${pick(f, 'BAccCode')}` : ''}</Text> : null}
          {pick(f, 'DueDay') ? <Text style={[u.code, tab]}>Credit {pick(f, 'DueDay')} days{pick(f, 'PanNo') ? `  ·  PAN ${pick(f, 'PanNo')}` : ''}</Text> : null}
        </View>
      ) : null}

      <ServerPicker<Row>
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="PACKING SLIP"
        title="Party"
        placeholder="Name, code, city or GSTIN"
        load={(q: string, page: number) => search(q.trim(), page)}
        emptyText="No party found. Try part of the name or the code."
        keyOf={(r: Row) => pick(r, 'acccode') || JSON.stringify(r)}
        render={(r: Row) => {
          const v = partyRowView(r);
          return {
            title: v.name || v.code,
            sub: [v.code, v.city, v.gstin || 'No GSTIN', v.mh && `MH ${v.mh}`, v.sh && `SH ${v.sh}`].filter(Boolean).join(' · '),
          };
        }}
        onPick={async (r: Row) => {
          const code = pick(r, 'acccode');
          if (has && code !== pick(f, 'ParCode') && !(await needsConfirm())) return;
          setOpen(false);
          await onChoose(code);
        }}
      />
    </View>
  );
}
