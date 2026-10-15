/**
 * Daily Production · checked Taka rows, from verified GryProcessC fields only.
 * Grade names from property-qualified DAPGrade; STOCK means a saved/completed
 * checking record, not a claim that fabric remains in available inventory.
 */
import React from 'react';
import { Text, View } from 'react-native';
import {
  CheckingRollRow, DailyRow, checkingIdentity, beamDisplayLabel, displayMachine, ymdToIso,
} from './ProductionDailyModel';

const PALETTE = {
  ink: '#102132', mut: '#85818A', border: '#EBE5DE', purple: '#76288B',
  alert: '#946000',
};
const n = (value: number, decimals = 0) => Number(value || 0).toLocaleString('en-IN', {
  maximumFractionDigits: decimals,
});
const formatDate = (raw: number | string) => {
  const iso = ymdToIso(raw);
  return /^\d{4}-\d\d-\d\d$/.test(iso) ? `${iso.slice(8,10)}-${iso.slice(5,7)}-${iso.slice(0,4)}` : iso;
};
const cell = (width: number) => ({ width, flexShrink: 0 } as const);
const header = { fontSize: 9, color: PALETTE.mut, fontWeight: '800' as const };

export type ProductionCheckingTableProps = {
  rows: CheckingRollRow[];
  aggregateRows: DailyRow[];
  compact: boolean;
  partial?: boolean;
  busy?: boolean;
  /** Exact ERP selection label, not a synthetic roll count. */
  context?: string;
};
export default function ProductionCheckingTable({ rows, aggregateRows, compact, partial = false, busy = false, context }: ProductionCheckingTableProps) {
  const lookups = new Map(aggregateRows.map(r => [checkingIdentity(r), r]));
  const total = rows.reduce((sum, r) => sum + Number(r.metres || 0), 0);
  return <View style={{ minWidth: 0 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 7, marginBottom: 9 }}>
      <Text style={{ color: PALETTE.ink, fontSize: 13, fontWeight: '900' }}>Rolls / checking entries</Text>
      <Text style={{ color: PALETTE.mut, fontSize: 10 }}>{n(rows.length)} {partial ? 'displayed' : 'checked'} Taka{context ? ` · ${context}` : ''}</Text>
    </View>
    {partial && <Text style={{ color: PALETTE.alert, fontSize: 11, marginBottom: 8 }}>
      Partial checking entries: totals below include displayed rows only; do not compare with the full-period production total.
    </Text>}
    {busy && <Text style={{ color: PALETTE.mut, fontSize: 11 }}>Loading checking entries…</Text>}
    {!compact && <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: PALETTE.border, paddingBottom: 7, gap: 9 }}>
      <Text style={{ ...header, flex: 1 }}>TAKA · CHECKING DATE</Text>
      <Text style={{ ...header, ...cell(75) }}>BEAM</Text>
      <Text style={{ ...header, ...cell(85) }}>MACHINE</Text>
      <Text style={{ ...header, ...cell(30), textAlign: 'right' }}>#</Text>
      <Text style={{ ...header, ...cell(72), textAlign: 'right' }}>METRES</Text>
      <Text style={{ ...header, ...cell(40), textAlign: 'center' }}>GRADE</Text>
      <Text style={{ ...header, ...cell(54), textAlign: 'center' }}>STATUS</Text>
    </View>}
    {rows.map((r, index) => {
      const parent = lookups.get(checkingIdentity(r));
      const beam = beamDisplayLabel({
        beam_no: r.beam_no ?? parent?.beam_no, beam_uid: r.beam_uid ?? 0, process_uid: r.process_uid,
      });
      const machine = parent
        ? displayMachine(parent.machine_label || parent.machine_name || String(r.machine_code))
        : `${r.prpcode} · ${r.machine_code}`;
      const taka = String(r.taka_no ?? '').trim() || 'Taka not recorded';
      // Resolve the actual description from DAPGrade (e.g. 1 → A for MW).
      // A missing master name falls back to the source code, never a guessed grade.
      const gradeCode = r.grade_code === null || r.grade_code === undefined
        ? '' : String(r.grade_code).trim().replace(/\.0+$/, '');
      const grade = String(r.grade_name || '').trim() || gradeCode || '—';
      // Every row here is a SAVED GryProcessC checking entry. Per the agreed
      // workflow UI, completed checking is STOCK (not physical stock balance).
      // An explicit future workflow state can override this label.
      const stockStatus = String(r.checking_status || 'STOCK').trim().toUpperCase();
      return compact ? <View key={`${r.prpcode}|${r.process_uid}|${r.srno}|${index}`} style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: PALETTE.border, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text selectable style={{ color: PALETTE.ink, fontSize: 12, fontWeight: '800', flexShrink: 1 }}>
            {taka} <Text style={{ color: PALETTE.mut, fontWeight: '400' }}>· {formatDate(r.chkdate)}</Text>
          </Text>
          <Text style={{ color: PALETTE.purple, fontSize: 12, fontWeight: '900' }}>{n(Number(r.metres), 3)} m</Text>
        </View>
        <Text style={{ color: PALETTE.mut, fontSize: 10 }} numberOfLines={3}>
          Beam {beam} · {machine} · {r.prpcode} · Checking Sr {r.srno} · Grade {grade} · {stockStatus}{Number(r.is_last_taka) === 1 ? ' · Last Taka' : ''}
        </Text>
      </View> : <View key={`${r.prpcode}|${r.process_uid}|${r.srno}|${index}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderColor: PALETTE.border, gap: 9 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text selectable numberOfLines={2} style={{ fontSize: 11, fontWeight: '800', color: PALETTE.ink }}>{taka}</Text>
          <Text style={{ fontSize: 10, color: PALETTE.mut }}>{formatDate(r.chkdate)}</Text>
        </View>
        <Text selectable numberOfLines={2} style={{ ...cell(75), fontSize: 11, fontWeight: '700', color: PALETTE.ink }}>{beam}</Text>
        <View style={cell(85)}><Text numberOfLines={1} style={{ fontSize: 11, color: PALETTE.ink }}>{machine}</Text><Text style={{ fontSize: 9, color: PALETTE.mut }}>{r.prpcode}</Text></View>
        <Text style={{ ...cell(30), textAlign: 'right', fontSize: 10, color: PALETTE.mut }}>{r.srno}</Text>
        <Text style={{ ...cell(72), textAlign: 'right', fontSize: 11, fontWeight: '900', color: PALETTE.ink }}>{n(Number(r.metres), 3)}</Text>
        <Text style={{ ...cell(40), textAlign: 'center', fontSize: 10, color: grade !== '—' ? PALETTE.ink : PALETTE.mut, fontWeight: grade !== '—' ? '800' : '400' }}>{grade}</Text>
        <View style={{...cell(58),alignItems:'center'}}><Text style={{fontSize:9,color:stockStatus==='STOCK'?'#276749':'#946000',backgroundColor:stockStatus==='STOCK'?'#E7F6ED':'#FFF5DA',overflow:'hidden',borderRadius:6,paddingVertical:4,paddingHorizontal:5,fontWeight:'800'}}>{stockStatus}</Text></View>
      </View>;
    })}
    {!busy && rows.length === 0 && <Text style={{ fontSize: 11, color: PALETTE.mut, paddingVertical: 10 }}>No checked Taka entries in this selection.</Text>}
    {(rows.length > 0) && <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 4, gap: 8 }}>
      <Text style={{ color: PALETTE.ink, fontSize: 12, fontWeight: '900' }}>
        Total · {n(rows.length)} checked Taka{partial ? ' (partial)' : ''}
      </Text>
      <Text style={{ color: PALETTE.purple, fontSize: 12, fontWeight: '900' }}>{n(total,3)} m</Text>
    </View>}
  </View>;
}
