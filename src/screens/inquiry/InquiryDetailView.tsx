// FILE: src/screens/inquiry/InquiryDetailView.tsx
// Inquiry detail (legacy InquiryDetailScreen + TatTimeline).
//   GET /api/inquiries/{id}                      (+ tat_live)
//   GET .../designs/{designId}/cost-sheet        per design (parallel)
//   GET /api/inquiries/{id}/pdf                  Download PDF
// Actions (same status rules as legacy):
//   pending_costing   -> Add Costing (costing picker)
//   costed / sent     -> Send Quotation · Download PDF · Mark Confirmed · Mark Rejected
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useInquiry, useInquiryNav, useViewFocus } from './InquiryContext';
import {
  CostSheet,
  DsnWord,
  errMsg,
  formatCurrency,
  formatDate,
  formatHours,
  formatQty,
  gmColor,
  Inquiry,
  num,
  SHEET_META,
  sheetLocked,
  TAT_META,
  TatLive,
  TatLiveState,
} from './inquiryModel';
import { Banner, Btn, Card, ErrorBox, IconBtn, KV, Loader, MONO, Pill, StatusBadge, TatBadge, useWide, ViewShell } from './ui';

export function InquiryDetailView({ id }: { id: number }) {
  const { api, prptype, rights } = useInquiry();
  const nav = useInquiryNav();
  const { wide } = useWide();
  const [inq, setInq] = useState<Inquiry | null>(null);
  const [sheets, setSheets] = useState<Record<number, CostSheet | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.show(id);
      setInq(data);
      const list = data.designs ?? [];
      const res = await Promise.all(list.map((d) => api.costSheet(data.id, d.id).catch(() => null)));
      const map: Record<number, CostSheet | null> = {};
      list.forEach((d, i) => { map[d.id] = res[i]; });
      setSheets(map);
    } catch (e) {
      setError(errMsg(e, 'Unable to load inquiry'));
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useViewFocus(() => { void load(); }, [load]);

  const downloadPdf = async () => {
    if (!inq) return;
    setPdfBusy(true);
    try {
      const { pdf_url } = await api.pdf(inq.id);
      if (pdf_url) await Linking.openURL(pdf_url);
    } catch (e) {
      AppAlert.alert('Error', errMsg(e, 'Failed to download PDF'));
    } finally {
      setPdfBusy(false);
    }
  };

  if (loading && !inq) return <ViewShell title="Inquiry Details"><Loader label="Loading inquiry…" /></ViewShell>;
  if (!inq) {
    return (
      <ViewShell title="Inquiry Details">
        <ErrorBox text={error || 'Inquiry not found'} onRetry={() => { setLoading(true); void load(); }} />
      </ViewShell>
    );
  }

  const canCost = inq.status === 'pending_costing';
  const canSend = inq.status === 'costed' || inq.status === 'sent';
  const designs = inq.designs ?? [];
  const subTotal = designs.reduce((s, d) => s + num(d.amount), 0);
  const gstTotal = designs.reduce((s, d) => s + num(d.gst_amount), 0);
  const grand = subTotal + gstTotal;
  const overall = inq.tat?.overall_status;
  const viewOnly = rights?.detachtds === '1';

  return (
    <ViewShell
      title={inq.inquiry_no}
      subtitle={`${inq.party_name} · ${formatDate(inq.inquiry_date)}`}
      maxWidth={1000}
      right={!viewOnly ? (
        <IconBtn icon="notes" label="Notes" onPress={() => nav.push({ name: 'notes', inquiryId: inq.id, inquiryNo: inq.inquiry_no })} />
      ) : null}
    >
      {!!error && <ErrorBox text={error} onRetry={load} />}

      <View style={s.hero}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.heroNo}>{inq.inquiry_no}</Text>
          <Text style={s.heroDate}>{formatDate(inq.inquiry_date)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <StatusBadge status={inq.status} label={inq.status_label || undefined} />
          {!!overall && overall !== 'not_applicable' && <TatBadge status={overall} prefix="TAT: " />}
        </View>
      </View>

      <View style={[wide && s.cols]}>
        <View style={[wide && s.colMain]}>
          <Card title="Party">
            <Text style={s.party}>{inq.party_name}</Text>
            {!!inq.party_address && <Text style={s.meta}>{inq.party_address}</Text>}
            {!!inq.party_gstin && <Text style={[s.meta, { fontFamily: MONO }]}>GSTIN: {inq.party_gstin}</Text>}
            {!!inq.remarks && <Text style={[s.meta, { marginTop: 6 }]}>Remarks: {inq.remarks}</Text>}
          </Card>

          <Text style={s.section}>{DsnWord(prptype, true)} ({designs.length})</Text>
          {designs.map((d, idx) => {
            const cs = sheets[d.id];
            return (
              <Card key={d.id}>
                <View style={s.dHead}>
                  <Text style={s.dName} numberOfLines={2}>{idx + 1}. {d.design_name}{d.is_new_design ? ' (New)' : ''}</Text>
                  <Pill
                    label={d.is_costed ? 'Costed' : 'Pending'}
                    fg={d.is_costed ? T.green : T.amber}
                    bg={d.is_costed ? `${T.green}1A` : `${T.amber}1A`}
                  />
                </View>
                {!!d.construction_remarks && <Text style={s.construction}>{d.construction_remarks}</Text>}
                <View style={s.kvRow}>
                  <Text style={s.kvTxt}>Qty <Text style={s.kvVal}>{formatQty(d.quantity)} {d.unit}</Text></Text>
                  {d.cost_per_mtr !== null && d.cost_per_mtr !== undefined && (
                    <Text style={s.kvTxt}>Rate <Text style={s.kvVal}>{formatCurrency(d.cost_per_mtr)}</Text></Text>
                  )}
                  {!!d.expected_delivery_date && <Text style={s.kvTxt}>Delivery <Text style={s.kvVal}>{formatDate(d.expected_delivery_date)}</Text></Text>}
                </View>
                {!!d.shades?.length && (
                  <View style={s.shadeWrap}>
                    {d.shades.map((sh, i) => (
                      <View key={`${sh.shade_code}-${i}`} style={s.shadeChip}>
                        <Text style={s.shadeChipText} numberOfLines={1}>{sh.shade_name} · {formatQty(sh.quantity)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {d.is_costed && (
                  <View style={[s.kvRow, { marginTop: 6 }]}>
                    <Text style={s.kvTxt}>GST {d.gst_percent}%</Text>
                    <Text style={[s.kvVal, { fontSize: 14 }]}>{formatCurrency(d.total_amount)}</Text>
                  </View>
                )}

                {!!cs && (
                  <View style={s.cs}>
                    <View style={s.csHead}>
                      <Icon name="request-quote" size={15} color={T.copper} />
                      <Text style={s.csTitle}>COST SHEET</Text>
                      <View style={{ flex: 1 }} />
                      <Pill label={SHEET_META[cs.auth_status]?.label ?? 'Draft'} fg={SHEET_META[cs.auth_status]?.fg ?? T.muted} bg={SHEET_META[cs.auth_status]?.bg ?? T.alt} />
                    </View>
                    <View style={s.csStats}>
                      <Stat label="Total cost" value={formatCurrency(cs.total_cost)} />
                      <Stat label="Sale rate" value={formatCurrency(cs.sale_rate)} />
                      <Stat label="GM" value={`${cs.gross_margin_pct}%`} color={gmColor(num(cs.gross_margin_pct))} />
                    </View>
                    {cs.auth_status === 'rejected' && !!cs.rejection_reason && (
                      <Banner tone="danger" title={`Rejected: ${cs.rejection_reason}`} text={cs.rejection_remarks} />
                    )}
                    <TouchableOpacity
                      onPress={() => nav.push({ name: 'costSheet', inquiryId: inq.id, designId: d.id })}
                      style={s.csOpen}
                      activeOpacity={0.75}
                    >
                      <Text style={s.csOpenText}>{sheetLocked(cs) ? 'View Cost Sheet' : 'Edit Cost Sheet'}</Text>
                      <Icon name="arrow-forward" size={15} color={T.copper} />
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            );
          })}

          {grand > 0 && (
            <Card title="Totals">
              <KV k="Sub Total" v={formatCurrency(subTotal)} />
              <KV k="GST" v={formatCurrency(gstTotal)} />
              <KV k="Grand Total" v={formatCurrency(grand)} strong last />
            </Card>
          )}

          {!!inq.sales_order && (
            <Banner
              tone="success"
              icon="check-circle"
              title={`Converted to Sales Order ${inq.sales_order.so_no}`}
              text={`${formatDate(inq.sales_order.so_date)} · ${formatCurrency(inq.sales_order.grand_total)}`}
            />
          )}
          {!!inq.rejection && (
            <Banner tone="danger" icon="cancel" title={`Rejected: ${inq.rejection.reason}`} text={inq.rejection.remarks} />
          )}
        </View>

        <View style={[wide && s.colSide]}>
          {!!inq.tat_live && <TatTimeline tat={inq.tat_live} />}

          {(canCost || canSend) && (
            <Card title="Actions">
              <View style={{ gap: 8 }}>
                {canCost && (
                  <Btn title="Add Costing" icon="calculate" variant="accent" onPress={() => nav.push({ name: 'costingPicker', id: inq.id })} />
                )}
                {canSend && (
                  <>
                    <Btn title="Send Quotation to Party" icon="send" onPress={() => nav.push({ name: 'quotation', id: inq.id })} />
                    <Btn title="Download PDF" icon="picture-as-pdf" variant="outline" onPress={downloadPdf} loading={pdfBusy} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Btn title="Mark Confirmed" icon="check" variant="secondary" onPress={() => nav.push({ name: 'confirm', id: inq.id })} style={{ flex: 1 }} />
                      <Btn title="Mark Rejected" icon="close" variant="danger" onPress={() => nav.push({ name: 'reject', id: inq.id })} style={{ flex: 1 }} />
                    </View>
                  </>
                )}
              </View>
            </Card>
          )}
        </View>
      </View>
    </ViewShell>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={[s.stat, !!color && { backgroundColor: `${color}14` }]}>
      <Text style={[s.statLbl, !!color && { color }]}>{label}</Text>
      <Text style={[s.statVal, !!color && { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  TAT timeline (legacy TatTimeline)                                          */
/* -------------------------------------------------------------------------- */

function TatTimeline({ tat }: { tat: TatLive }) {
  const steps = [tat.costing, tat.send_quotation, tat.party_response, tat.overall].filter(Boolean);
  return (
    <Card title="TAT Timeline">
      {steps.map((step, i) => <TatStep key={step.step_code || `s${i}`} step={step} last={i === steps.length - 1} />)}
    </Card>
  );
}

function TatStep({ step, last }: { step: TatLiveState; last: boolean }) {
  const c = TAT_META[step.status] || TAT_META.not_applicable;
  if (!step.is_started) {
    return (
      <View style={s.tRow}>
        <View style={s.tRail}>
          <View style={[s.tDot, { borderColor: T.border, backgroundColor: T.surface }]} />
          {!last && <View style={s.tLine} />}
        </View>
        <View style={s.tBody}>
          <Text style={s.tName}>{step.step_name}</Text>
          <Text style={s.tMuted}>Not yet started</Text>
        </View>
      </View>
    );
  }
  const pct = Math.min(num(step.percent_used), 100);
  return (
    <View style={s.tRow}>
      <View style={s.tRail}>
        <View style={[s.tDot, { borderColor: c.fg, backgroundColor: step.is_completed ? c.fg : c.bg }]}>
          {step.is_completed && <Icon name="check" size={10} color="#fff" />}
        </View>
        {!last && <View style={[s.tLine, step.is_completed && { backgroundColor: c.fg }]} />}
      </View>
      <View style={s.tBody}>
        <View style={s.tHead}>
          <Text style={s.tName} numberOfLines={1}>{step.step_name}</Text>
          <Pill label={c.label} fg={c.fg} bg={c.bg} icon={c.icon} />
        </View>
        <View style={s.tMeta}>
          <Text style={s.tMuted}>Expected: {formatHours(step.expected_hours)}</Text>
          <Text style={s.tMuted}>{step.is_completed ? 'Took: ' : 'Elapsed: '}{formatHours(step.elapsed_hours)}</Text>
        </View>
        <View style={s.track}><View style={[s.fill, { width: `${pct}%`, backgroundColor: c.fg }]} /></View>
        <View style={s.tMeta}>
          {num(step.variance_hours) > 0 ? (
            <Text style={[s.tVar, { color: c.fg }]}>{formatHours(step.variance_hours)} over</Text>
          ) : num(step.variance_hours) < 0 ? (
            <Text style={[s.tVar, { color: T.green }]}>{formatHours(Math.abs(step.variance_hours))} ahead</Text>
          ) : (
            <Text style={s.tVar}>On target</Text>
          )}
          <Text style={s.tMuted}>{Math.round(num(step.percent_used))}% used</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  cols: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  colMain: { flex: 1.6, minWidth: 0 },
  colSide: { flex: 1, minWidth: 280 },
  hero: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: T.nav, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  heroNo: { fontSize: 19, fontWeight: '900', color: '#fff', fontFamily: MONO },
  heroDate: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  party: { fontSize: 15, fontWeight: '900', color: T.yd },
  meta: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 3 },
  section: { fontSize: 12, fontWeight: '900', color: T.ink, marginBottom: 8, marginTop: 2, letterSpacing: 0.3 },
  dHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  dName: { flex: 1, fontSize: 14, fontWeight: '900', color: T.ink },
  construction: { fontSize: 12, fontWeight: '600', color: T.muted, fontStyle: 'italic', marginBottom: 6 },
  kvRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginTop: 2 },
  kvTxt: { fontSize: 12, fontWeight: '600', color: T.muted },
  kvVal: { color: T.ink, fontWeight: '800', fontFamily: MONO },
  shadeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  shadeChip: { borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  shadeChipText: { fontSize: 11, fontWeight: '700', color: T.ink, maxWidth: 200 },
  cs: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  csHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  csTitle: { fontSize: 10.5, fontWeight: '900', color: T.ink, letterSpacing: 0.5 },
  csStats: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  stat: { flex: 1, backgroundColor: T.sub, borderRadius: 8, padding: 8 },
  statLbl: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.3 },
  statVal: { fontSize: 12.5, fontWeight: '900', color: T.ink, fontFamily: MONO, marginTop: 2 },
  csOpen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingVertical: 4 },
  csOpenText: { fontSize: 12.5, fontWeight: '900', color: T.copper },

  tRow: { flexDirection: 'row', gap: 10 },
  tRail: { width: 18, alignItems: 'center' },
  tDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  tLine: { flex: 1, width: 2, backgroundColor: T.border, marginVertical: 2, minHeight: 18 },
  tBody: { flex: 1, paddingBottom: 14, minWidth: 0 },
  tHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 },
  tName: { flex: 1, fontSize: 13, fontWeight: '900', color: T.ink },
  tMuted: { fontSize: 11, fontWeight: '600', color: T.muted },
  tMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 2 },
  tVar: { fontSize: 11, fontWeight: '800', color: T.muted },
  track: { height: 5, borderRadius: 3, backgroundColor: T.alt, overflow: 'hidden', marginTop: 5, marginBottom: 2 },
  fill: { height: 5, borderRadius: 3 },
});
