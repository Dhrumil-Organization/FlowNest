/** Claude Artifact Beam Status — real ERP Grey Checking and lifecycle.
 * Required-roll metrics are shown only when a genuine source is verified.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { api } from '@/src/screens/dashboard/employ/api/api';

export type BeamStatusRow = {
  prpcode: string; beam_uid: string; beam_no: string;
  warp_metres: number; beam_balance_metres: number;
  beam_date: number; machine_code: string; machine_label: string;
  shed_label: string; shed_key: string; design_name: string | null;
  design_code: string | null; category_name: string | null;
  status: BeamRowStatus; process_count: number;
  checked_rolls: number; checking_entries: number; checked_metres: number;
  required_rolls: number | null; generated_rolls: number | null;
  required_rolls_verified?: boolean;
  required_rolls_basis?: 'generated_label_fallback' | 'unavailable';
  matched_generated_rolls?: number | null;
  unmatched_checked_rolls?: number;
  designated_roll?: number | null;
  designated_entered?: boolean;
  superseded_last_rolls?: number[];
  missing_generated_rolls?: number[];
  pending_rolls: number | null; progress_pct: number | null;
  last_piece_seen: boolean; last_checking_date?: number | null;
  status_basis: string; warnings: string[];
};
export type StatusKey = 'RUNNING' | 'CHECK_PENDING' | 'LP_PENDING' | 'COMPLETED';
export type BeamRowStatus = StatusKey | 'UNVERIFIED';
type BeamReport = {
  as_on_ymd: number;
  source_scope: string;
  summary: Record<StatusKey, { beams: number; checked_metres: number }>;
  pending_count: number; total_in_four_groups: number;
  pending_beams: BeamStatusRow[];
  verification_count?: number;
  verification_checked_metres?: number;
  verification_beams?: BeamStatusRow[];
  excluded: Record<string, number>;
  required_rolls_verified: boolean;
  generated_label_comparison_available?: boolean;
  generated_label_beam_count?: number;
  notes?: string[];
};
const NAVY = '#102132', MUTED = '#7C7D84', BDR = '#E7E0DA', PURPLE = '#742786';
const C: Record<BeamRowStatus, string> = {
  RUNNING: '#1C567A', CHECK_PENDING: '#C98A1A', LP_PENDING: '#8E44AD', COMPLETED: '#2A6044',
  UNVERIFIED: '#9299A3',
};
const LABEL: Record<BeamRowStatus, string> = {
  RUNNING: 'Running',
  CHECK_PENDING: 'Finished — checking pending',
  LP_PENDING: 'Last piece entered — rolls pending',
  COMPLETED: 'Completed / closed',
  UNVERIFIED: 'Last Taka Set — checking to verify',
};
const ORDER: StatusKey[] = ['RUNNING', 'CHECK_PENDING', 'LP_PENDING', 'COMPLETED'];
const nfmt = (n: number, decimals = 0) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: decimals });
const ymd = (value: number) => { const s = String(value || ''); return /^\d{8}$/.test(s) ? `${s.slice(6,8)}-${s.slice(4,6)}-${s.slice(0,4)}` : '—'; };
const currentDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const boxStyle = { backgroundColor: '#FFF', borderColor: BDR, borderWidth: 1, borderRadius: 12 } as const;
function SmallLabel({ children, color = MUTED }: { children: React.ReactNode; color?: string }) {
  return <Text style={{ color, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.35 }}>{children}</Text>;
}
function BeamLine({ r, compact, open }: { r: BeamStatusRow; compact: boolean; open: () => void }) {
  const color = C[r.status] || MUTED;
  const hasDenominator = r.required_rolls != null && Number(r.required_rolls) > 0;
  const denominator = Number(r.required_rolls || 0);
  const comparedRolls = r.checked_rolls;
  // The Claude row bar must remain visible even when required Taka is unknown.
  // This bar is explicitly a METRES comparison, NOT checked / required rolls.
  // WarpLen and checked metres are both sourced from the same ERP physical beam.
  const warpMetres = Number(r.warp_metres || 0);
  const checkedMetres = Number(r.checked_metres || 0);
  const hasMetreCoverage = Number.isFinite(warpMetres) && warpMetres > 0
    && Number.isFinite(checkedMetres) && checkedMetres >= 0;
  const metreCoverage = hasMetreCoverage ? checkedMetres / warpMetres * 100 : null;
  const fillPct = metreCoverage === null ? 0 : Math.min(100, Math.max(0, metreCoverage));
  const warnings = Array.isArray(r.warnings) ? r.warnings : [];
  const [hover, setHover] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showDetail = hover || detailsOpen;
  const displayChecked = hasDenominator ? comparedRolls : r.checked_rolls;
  const shortNote = `warp ${nfmt(r.warp_metres, 2)} m${r.last_piece_seen || r.status === 'UNVERIFIED' ? ' · last Taka recorded' : ''}`;
  const showTooltip = () => setHover(true);
  const hideTooltip = () => setHover(false);
  const toggleTooltip = (e: any) => { e?.stopPropagation?.(); setDetailsOpen(v => !v); };
  return <Pressable onPress={open} onLongPress={() => setDetailsOpen(v => !v)}
    accessibilityRole="button" accessibilityLabel={`Open ${r.beam_no} production checking`}
    style={{ paddingVertical: compact ? 12 : 8, paddingHorizontal: 12, borderBottomWidth: 1,
      borderBottomColor: '#F1EBE5', backgroundColor: showDetail ? '#FCFAFD' : '#FFF',
      zIndex: showDetail ? 20 : 0, overflow: 'visible' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 6 : 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '900', color: NAVY }}>{r.beam_no || '—'}</Text>
          {!!r.design_name && <Text numberOfLines={1} style={{ maxWidth: compact ? 145 : 220, fontSize: 11, color: NAVY, fontWeight: '700' }}>{r.design_name}</Text>}
          {!!r.category_name && <Text style={{ borderColor: '#DDD8E0', borderWidth: 1, backgroundColor: '#FBF9FB', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, fontSize: 9, color: NAVY, fontWeight: '700' }}>{r.category_name}</Text>}
          <View style={{ borderColor: '#DED8E5', borderWidth: 1, backgroundColor: '#F4EDF8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: 9, color: '#613B85', fontWeight: '800' }}>{r.machine_label || r.machine_code || '—'} · {r.shed_label || '—'}</Text>
          </View>
          <Pressable onHoverIn={showTooltip} onHoverOut={hideTooltip} onPress={toggleTooltip}
            accessibilityRole="button" accessibilityLabel={`Details for beam ${r.beam_no}`}
            style={{ backgroundColor: color, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
            <Text style={{ color: '#FFF', fontSize: 8.3, fontWeight: '900' }}>{LABEL[r.status]?.toUpperCase() || 'UNRESOLVED'}</Text>
          </Pressable>
        </View>
        <Pressable onHoverIn={showTooltip} onHoverOut={hideTooltip} onPress={toggleTooltip}
          accessibilityRole="button"
          accessibilityLabel={`Beam ${r.beam_no}: ${nfmt(r.checked_metres, 2)} checked metres out of ${nfmt(r.warp_metres, 2)} warp metres. Show details.`}
          style={{ height: 12, justifyContent: 'center', marginTop: 5 }}>
          <View style={{ height: 7, width: '100%', backgroundColor: '#EAE5E1', borderRadius: 8, overflow: 'hidden' }}>
            {hasMetreCoverage && fillPct > 0 &&
              <View style={{ height: 7, width: `${fillPct}%`, borderRadius: 8, backgroundColor: color }}/>} 
          </View>
        </Pressable>
        <Text numberOfLines={compact ? 2 : 1} style={{ color: MUTED, fontSize: 9.2, marginTop: 2 }}>{shortNote}</Text>
        {showDetail && <View style={{ position: 'absolute', left: compact ? 0 : 24, top: compact ? 60 : 42,
          maxWidth: compact ? 300 : 420, width: compact ? '94%' : '90%', backgroundColor: '#FFF',
          borderWidth: 1, borderColor: '#DDD5DF', borderRadius: 8, padding: 11, zIndex: 50,
          elevation: 12, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 9,
          shadowOffset: { width: 0, height: 4 }, gap: 5 }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: NAVY }}>{r.beam_no} · {LABEL[r.status]}</Text>
          <Text style={{ fontSize: 10, color: NAVY }}>
            {nfmt(r.checked_rolls)} checked Taka · {nfmt(r.checked_metres, 2)} m checked
          </Text>
          <Text style={{ fontSize: 10, color: NAVY }}>
            {hasMetreCoverage
              ? `${nfmt(checkedMetres, 2)} / ${nfmt(warpMetres, 2)} m · ${nfmt(metreCoverage || 0, 1)}% of beam warp metres`
              : 'Beam warp-metre comparison unavailable'}
          </Text>
          <Text style={{ fontSize: 10, color: MUTED }}>
            Bar indicates metres checked relative to beam warp metres, not Taka completion.
            {hasDenominator ? ` Required Taka: ${nfmt(denominator)}.` : ' Required and pending Taka are not confirmed.'}
          </Text>
          {r.last_piece_seen && <Text style={{ fontSize: 10, color: MUTED }}>Last Taka recorded; required checking completion is not confirmed.</Text>}
          {warnings.map((message, i) => <Text key={`${r.prpcode}-${r.beam_uid}-warn-${i}`} style={{ color: '#906321', fontSize: 9.7, lineHeight: 14 }}>{message}</Text>)}
          <Text style={{ color: MUTED, fontSize: 9.3 }}>Select the beam row to open checking records.</Text>
        </View>}
      </View>
      {compact ? <View style={{ width: 77, alignItems: 'flex-end', gap: 3 }}>
        <Text style={{ fontWeight: '900', fontSize: 11, color: NAVY }}>{nfmt(displayChecked)}{hasDenominator ? `/${nfmt(denominator)}` : ' checked'}</Text>
        <SmallLabel>ROLLS</SmallLabel>
        <Text style={{ fontWeight: '900', fontSize: 11, color: '#B7791F', marginTop: 3 }}>{r.pending_rolls === null ? '—' : nfmt(r.pending_rolls)}</Text>
        <SmallLabel>PENDING</SmallLabel>
        <Text style={{ fontWeight: '900', fontSize: 11, color: NAVY, marginTop: 3 }}>{nfmt(r.checked_metres, 2)}</Text>
        <SmallLabel>METRES</SmallLabel>
      </View> : <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ width: 65, fontWeight: '900', color: NAVY, fontSize: 11, textAlign: 'right' }}>{nfmt(displayChecked)}{hasDenominator ? `/${nfmt(denominator)}` : ' checked'}</Text>
        <Text style={{ width: 65, fontWeight: '900', color: '#B7791F', fontSize: 11, textAlign: 'right' }}>{r.pending_rolls === null ? '—' : nfmt(r.pending_rolls)}</Text>
        <Text style={{ width: 75, fontWeight: '900', color: NAVY, fontSize: 11, textAlign: 'right' }}>{nfmt(r.checked_metres, 2)}</Text>
      </View>}
    </View>
  </Pressable>;
}
export default function BeamStatusPanel({ prptype, onOpenBeam }: {
  prptype?: string; onOpenBeam: (beam: BeamStatusRow) => void;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const [report, setReport] = useState<BeamReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [focused, setFocused] = useState<StatusKey | null>(null);
  const [pinned, setPinned] = useState(false);
  const date = useMemo(currentDate, []);
  useEffect(() => {
    if (!prptype) { setError('The selected property type is missing.'); setReport(null); return; }
    let live = true;
    setLoading(true); setError('');
    api.getOwnerCardReport({ report_type: 'beam_status', date, prptype }).then((response: any) => {
      if (!live) return;
      if (!response?.success || !response?.data?.report?.summary || !Array.isArray(response.data.report.pending_beams)) {
        throw new Error(response?.message || 'Beam Status response is not available on Laravel.');
      }
      setReport(response.data.report);
    }).catch((e: any) => { if (live) setError(String(e?.message || e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [prptype, date, refreshSeq]);
  const summaries = report?.summary;
  const totals = ORDER.reduce((s, k) => s + Number(summaries?.[k]?.beams || 0), 0);
  const selected = focused ? summaries?.[focused] : undefined;
  const segments = useMemo(() => ORDER.filter(k => Number(summaries?.[k]?.beams || 0) > 0), [summaries]);
  const refresh = () => { if (!loading) setRefreshSeq(v => v + 1); };

  return <View style={{ width: '100%', minWidth: 0, gap: 12 }}>
    <View style={{ ...boxStyle, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F2E8F4' }}>
        <Text style={{ color: PURPLE, fontSize: 24 }}>◩</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: NAVY }}>Beam status</Text>
        <Text style={{ color: MUTED, fontSize: 10.5, marginTop: 3, lineHeight: 15 }}>
          Completion based on required rolls and checking entries — never the last-Taka mark alone
        </Text>
      </View>
      {!compact && <Text style={{ color: MUTED, fontSize: 9.5 }}>As on {ymd(Number(date.replace(/\D/g, '')))}</Text>}
      <TouchableOpacity disabled={loading} onPress={refresh} accessibilityRole="button"
        style={{ borderWidth: 1, borderColor: BDR, backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
        <Text style={{ color: PURPLE, fontSize: 10.5, fontWeight: '800' }}>↻ {loading ? 'Refreshing…' : 'Refresh'}</Text>
      </TouchableOpacity>
      <View style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#F2E8F4', alignItems: 'center' }}>
        <Text style={{ fontWeight: '900', fontSize: 15, color: PURPLE }}>{report ? nfmt(report.pending_count) : '—'}</Text>
        <Text style={{ color: MUTED, fontSize: 9 }}>open / review</Text>
      </View>
    </View>
    {!!error && <View style={{ ...boxStyle, padding: 14 }}><Text style={{ fontSize: 11, color: '#B54708' }}>{error}</Text><TouchableOpacity onPress={refresh} style={{ paddingTop: 8 }}><Text style={{ color: PURPLE, fontWeight: '800' }}>Retry</Text></TouchableOpacity></View>}
    {loading && <ActivityIndicator size="small" color={PURPLE} />}
    {report && <>
      <View style={{ ...boxStyle, padding: 12 }}>
        <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: '#EFEAE4', gap: 0 }}>
          {segments.map(k => <Pressable key={k} onHoverIn={() => { if (!pinned) setFocused(k); }} onHoverOut={() => { if (!pinned) setFocused(null); }}
            onPress={() => { setFocused(focused === k && pinned ? null : k); setPinned(!(focused === k && pinned)); }}
            accessibilityRole="button" accessibilityLabel={`${LABEL[k]} · ${nfmt(summaries?.[k]?.beams || 0)} beams`}
            style={{ width: `${Number(summaries?.[k]?.beams || 0) / Math.max(totals,1) * 100}%`, height: 14, backgroundColor: C[k], opacity: focused && focused !== k ? 0.5 : 1 }}/>) }
        </View>
        {selected && focused && <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 9, backgroundColor: '#F9F7F4', padding: 8, borderRadius: 8, gap: 8, alignItems: 'center' }}>
          <View style={{ width: 9, height: 9, backgroundColor: C[focused], borderRadius: 3 }}/>
          <Text style={{ fontSize: 11, color: NAVY, fontWeight: '800' }}>{LABEL[focused]}</Text>
          <Text style={{ color: MUTED, fontSize: 10 }}>{nfmt(selected.beams)} beams · {nfmt(selected.checked_metres, 2)} m checked</Text>
        </View>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 11, gap: compact ? 13 : 18 }}>
          {ORDER.map(k => <TouchableOpacity key={k} onPress={() => {setFocused(focused === k && pinned ? null : k);setPinned(!(focused === k && pinned));}}
            style={{ flexGrow: 1, flexBasis: compact ? '41%' : 145, minWidth: compact ? 125 : 145, paddingLeft: 8, borderLeftWidth: 3, borderLeftColor: C[k] }}>
            <SmallLabel>{LABEL[k].toUpperCase()}</SmallLabel>
            <Text style={{ fontSize: 14, fontWeight: '900', color: NAVY, marginTop: 3 }}>{nfmt(summaries?.[k]?.beams || 0)} <Text style={{ color: MUTED, fontSize: 10, fontWeight: '500' }}>beams</Text></Text>
            <Text style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{nfmt(summaries?.[k]?.checked_metres || 0, 2)} m checked</Text>
          </TouchableOpacity>)}
        </View>
      </View>
      <View style={{ ...boxStyle, overflow: 'visible' }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 11 }}>
          <Text style={{ fontSize: 12, fontWeight: '900', color: NAVY }}>Pending beams</Text>
        </View>
        {!compact && <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#F9F7F4', borderTopWidth: 1, borderBottomWidth: 1, borderColor: BDR }}>
          <SmallLabel>BEAM · DESIGN · CATEGORY</SmallLabel>
          <View style={{ flex: 1 }}/>
          <Text style={{ color: MUTED, fontSize: 9.5, fontWeight: '800', width: 65, textAlign: 'right' }}>ROLLS</Text><Text style={{ color: MUTED, fontSize: 9.5, fontWeight: '800', width: 65, textAlign: 'right' }}>PENDING</Text><Text style={{ color: MUTED, fontSize: 9.5, fontWeight: '800', width: 75, textAlign: 'right' }}>METRES</Text>
        </View>}
        {report.pending_beams.length ? report.pending_beams.map(r => <BeamLine key={`${r.prpcode}|${r.beam_uid}`} r={r} compact={compact} open={() => onOpenBeam(r)}/>)
          : <Text style={{ textAlign: 'center', fontSize: 12, color: MUTED, paddingVertical: 22 }}>No classified pending beams.</Text>}
      </View>
      {(report.verification_beams?.length || 0) > 0 && <View style={{ ...boxStyle, overflow: 'visible' }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '900', color: NAVY }}>Last Taka Set · checking to verify</Text>
          <View style={{ borderRadius: 7, backgroundColor: '#F0F1F3', paddingHorizontal: 7, paddingVertical: 3 }}>
            <Text style={{ color: '#5E6470', fontWeight: '800', fontSize: 10 }}>{nfmt(report.verification_count || 0)} beams</Text>
          </View>
          <Text style={{ color: MUTED, fontSize: 10 }}>
            Required Taka not verified; these beams are neither confirmed pending nor checking-complete.
          </Text>
        </View>
        {!compact && <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#F9F7F4', borderTopWidth: 1, borderBottomWidth: 1, borderColor: BDR }}>
          <SmallLabel>BEAM · DESIGN · CATEGORY</SmallLabel>
          <View style={{ flex: 1 }}/>
          <Text style={{ color: MUTED, fontSize: 9.5, fontWeight: '800', width: 65, textAlign: 'right' }}>CHECKED</Text>
          <Text style={{ color: MUTED, fontSize: 9.5, fontWeight: '800', width: 65, textAlign: 'right' }}>PENDING</Text>
          <Text style={{ color: MUTED, fontSize: 9.5, fontWeight: '800', width: 75, textAlign: 'right' }}>METRES</Text>
        </View>}
        {report.verification_beams?.map(r => <BeamLine key={`${r.prpcode}|${r.beam_uid}`} r={r} compact={compact} open={() => onOpenBeam(r)}/>)}
      </View>}
    </>}
  </View>;
}
