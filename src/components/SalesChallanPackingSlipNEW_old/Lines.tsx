// FILE: src/components/SalesChallanPackingSlipNEW/Lines.tsx
// The allocation lines (web right grid) and the summary carried onto later screens.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { Btn, ErrorText, FieldLabel, Hint, LinkBtn, tab, u } from '../PackingAutomationNEW/ui';
import type { Mode, Row } from './api';
import type { ScanDevice } from './ScanDevices';
import { assignQtyIssue, canAssign, cartonsOf, maxAssign, n3, pick, qty, splitTypes, sum } from './rules';
import { Bar, Sr, Stats, Tag, Tags } from './ui';

/* ------------------------------ one line ------------------------------ */

export function StockLine({ row, mode, d2, onAssign, onScan }: {
  row: Row; mode: Mode; d2: Row[]; onAssign?: (v: string) => string; onScan?: (device: ScanDevice) => void;
}) {
  const [draft, setDraft] = useState(String(row.AssQty ?? ''));
  useEffect(() => { setDraft(String(row.AssQty ?? '')); }, [row.AssQty]);

  const editable = !!onAssign && (mode === 'add' || mode === 'edit') && canAssign(row, mode);
  /** Valid values are kept as you type; an invalid one shows its reason and the last good value stays saved. */
  const change = (v: string) => {
    const clean = v.replace(/[^0-9.,]/g, '');
    setDraft(clean);
    if (onAssign && !assignQtyIssue(row, clean)) onAssign(clean);
  };
  const issue = editable ? assignQtyIssue(row, draft) : '';

  const cartons = cartonsOf(d2, row.SrNo);
  const scannedQty = sum(cartons, 'QtyWt');
  const total = parseInt(row.TotCarton, 10) || 0;
  const target = n3(row.BQty);
  const full = target > 0 && n3(scannedQty) >= target;
  const assigned = n3(row.AssQty) > 0;
  const shortStock = n3(row.StkQty) < n3(row.BQty);

  return (
    <View style={[u.card, assigned && mode !== 'scan' && { borderColor: T.copper + '66' }, mode === 'scan' && full && { borderColor: T.green + '66' }]}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Sr n={row.SrNo} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {row.SONo ? <Text style={[{ fontSize: 13, fontWeight: '800', color: T.copper }, tab]}>SO {row.SONo}</Text> : null}
          <Text style={{ fontSize: 16.5, fontWeight: '800', color: T.ink, marginTop: 1 }}>{row.ItmName}</Text>
          <Tags>
            {row.MerName ? <Tag text={`Merge ${row.MerName}`} /> : null}
            {row.GrdName ? <Tag text={`Grade ${row.GrdName}`} /> : null}
            {row.ShdName ? <Tag text={row.ShdName} /> : null}
            {!editable && (mode === 'add' || mode === 'edit') ? <Tag text="Locked" tone="amber" /> : null}
            {mode === 'scan' && full ? <Tag text="All scanned" tone="green" /> : null}
          </Tags>
        </View>
      </View>

      {mode === 'scan' ? (
        <>
          <Stats items={[
            { label: 'Bal. qty', value: qty(row.BQty) },
            { label: 'Cartons', value: `${cartons.length} / ${total}` },
            { label: 'Scanned qty', value: qty(scannedQty), tone: full ? 'green' : undefined },
          ]} />
          <View style={{ marginTop: 10 }}><Bar value={target ? scannedQty / target : 0} tone={full ? 'green' : 'copper'} /></View>
          {/* Two scanner device types, like WarehouseNEW Assign / Transfer */}
          <Text style={[u.kicker, { marginTop: 12, marginBottom: 6 }]}>{cartons.length ? 'Continue scanning with' : 'Scan cartons with'}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn flex label="Hardware scanner" icon="qr-code-scanner" kind={full ? 'ghost' : 'dark'} onPress={() => onScan?.('hardware')} />
            <Btn flex label="Mobile camera" icon="photo-camera" kind="ghost" onPress={() => onScan?.('camera')} />
          </View>
        </>
      ) : (
        <>
          <Stats items={[
            { label: 'Bal. qty', value: qty(row.BQty) },
            { label: 'Stock', value: qty(row.StkQty), tone: shortStock ? 'amber' : undefined },
            { label: 'Cartons', value: String(row.TotCarton ?? 0) },
          ]} />
          {mode === 'view' ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <Text style={u.label}>Assigned</Text>
              <Text style={[{ fontSize: 17, fontWeight: '800', color: T.ink }, tab]}>{assigned ? qty(row.AssQty) : '—'}</Text>
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <FieldLabel label="Assign qty" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[u.field, { flex: 1 }, !!issue && { borderColor: T.red }, !editable && u.fieldOff]}>
                  <TextInput
                    value={draft}
                    onChangeText={change}
                    editable={editable}
                    placeholder="0.000"
                    placeholderTextColor={T.muted}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    accessibilityLabel={`Assign qty line ${row.SrNo}`}
                    style={[u.input, { fontSize: 20, minWidth: 0 }, tab, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                  />
                </View>
                {editable ? <LinkBtn label="Max" onPress={() => change(maxAssign(row).toFixed(3))} /> : null}
              </View>
              {issue ? <ErrorText>{`${issue} Saved: ${n3(row.AssQty) > 0 ? qty(row.AssQty) : 'nothing'}.`}</ErrorText>
                : <Hint>{editable ? `Up to ${qty(maxAssign(row))} (lower of bal. qty and stock)` : 'Saved line — assign qty cannot be changed.'}</Hint>}
            </View>
          )}
        </>
      )}
    </View>
  );
}

/* ------------------------------ carried-forward summary ------------------------------ */

function KV({ label, value, sub, wide }: { label: string; value?: string; sub?: string; wide?: boolean }) {
  return (
    <View style={{ width: wide ? '100%' : '50%', paddingRight: 10, marginBottom: 10 }}>
      <Text style={u.kvLabel}>{label}</Text>
      <Text style={[u.kvValue, !value && { color: T.muted }]}>{value || '—'}</Text>
      {sub ? <Text style={[u.code, tab]}>{sub}</Text> : null}
    </View>
  );
}

/** Everything chosen on step 1, shown on later screens (like PackingAutomationNEW SelectionsCard). */
export function SlipSummary({ f, facility, onEdit, status }: { f: Row; facility: string; onEdit?: () => void; status?: React.ReactNode }) {
  const types = splitTypes(f.ProdTtype);
  const no = [pick(f, 'ChalNo'), pick(f, 'suffix')].filter(Boolean).join(' / ');
  return (
    <View style={[u.card, { paddingTop: 4 }]} accessibilityLabel="Packing slip summary">
      <View style={u.sectionHead}>
        <Text style={u.kicker}>Packing slip</Text>
        {onEdit ? <LinkBtn label="Edit" icon="edit" onPress={onEdit} /> : status}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon name="business" size={16} color={T.muted} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: T.ink }}>{facility}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <KV label="Packing no." value={no} sub={pick(f, 'UId') && pick(f, 'UId') !== '0' ? `UID ${pick(f, 'UId')}` : undefined} />
        <KV label="Date" value={pick(f, 'ChalDate')} />
        <KV label="Party" value={pick(f, 'ParName')} sub={[pick(f, 'ParCode'), pick(f, 'DCity', 'city'), pick(f, 'GSTIN')].filter(Boolean).join(' · ')} wide />
        <KV label="Order lines" value={String((f.d1 || []).length)} />
        <KV label="Production type" value={types.length ? types.join(', ') : 'All'} sub={pick(f, 'chees') ? `Chees ${pick(f, 'chees')}` : undefined} />
      </View>
    </View>
  );
}

/** One-line slip strip for the phone on the assign step (the full summary sits beside the lines on tablet). */
export function SlipStrip({ f, onEdit }: { f: Row; onEdit?: () => void }) {
  const no = [pick(f, 'ChalNo'), pick(f, 'suffix')].filter(Boolean).join(' / ');
  return (
    <View style={[u.card, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '800', color: T.ink }} numberOfLines={1}>{pick(f, 'ParName') || 'No party'}</Text>
        <Text style={[u.code, tab]} numberOfLines={1}>
          No. {no || '—'} · {pick(f, 'ChalDate')} · {(f.d1 || []).length} order line{(f.d1 || []).length === 1 ? '' : 's'}
        </Text>
      </View>
      {onEdit ? <LinkBtn label="Edit" icon="edit" onPress={onEdit} /> : null}
    </View>
  );
}
