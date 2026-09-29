// FILE: src/screens/inquiry/CostingViews.tsx
// Costing (legacy CostSheetDesignPickerScreen + CostSheetScreen).
//
// Picker: every design/item of the inquiry with its costing state
//   simple + is_costed -> Completed · no sheet -> Not Started · draft ·
//   awaiting_auth · approved · rejected. Progress = approved (or simple costed) / total.
//
// Cost sheet of ONE design/item:
//   prptype S      -> "Simple Costing" (POST /api/inquiries/{id}/costing, no auth)
//                     (+ the Cost Sheet tab when a sheet already exists)
//   other prptypes -> "Cost Sheet" only (save draft / submit for authorization)
//   awaiting_auth / approved -> read-only. Totals recomputed locally with the
//   same formula as legacy (brokerage = % of greige rate).
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useInquiry, useInquiryNav, useViewFocus } from './InquiryContext';
import {
  brokerageAmount,
  CostSheet,
  defaultSheet,
  dsnWord,
  errMsg,
  formatCurrency,
  formatQty,
  gmBg,
  gmColor,
  Inquiry,
  InquiryDesign,
  isSip,
  num,
  recompute,
  SHEET_META,
  sheetLocked,
} from './inquiryModel';
import { Banner, Btn, Card, ErrorBox, Field, Loader, MONO, Pill, useWide, ViewShell } from './ui';

/* -------------------------------------------------------------------------- */
/*  Design / item picker                                                        */
/* -------------------------------------------------------------------------- */

type Row = { d: InquiryDesign; sheet: CostSheet | null };

const rowState = (r: Row) => {
  if (r.d.costing_method === 'simple' && r.d.is_costed) {
    return { label: 'Completed', fg: T.green, bg: `${T.green}1A`, action: 'View Costing', done: true };
  }
  if (!r.sheet) return { label: 'Not Started', fg: T.muted, bg: T.alt, action: 'Start Cost', done: false };
  const m = SHEET_META[r.sheet.auth_status] ?? SHEET_META.draft;
  const action = { draft: 'Continue Editing', awaiting_auth: 'View', approved: 'View', rejected: 'Fix & Resubmit' }[r.sheet.auth_status] ?? 'Open';
  return { label: m.label, fg: m.fg, bg: m.bg, action, done: r.sheet.auth_status === 'approved' };
};

export function CostingPickerView({ id }: { id: number }) {
  const { api, prptype } = useInquiry();
  const nav = useInquiryNav();
  const { wide } = useWide();
  const [inq, setInq] = useState<Inquiry | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.show(id);
      const list = data.designs ?? [];
      const sheets = await Promise.all(list.map((d) => api.costSheet(data.id, d.id).catch(() => null)));
      setInq(data);
      setRows(list.map((d, i) => ({ d, sheet: sheets[i] })));
    } catch (e) {
      setError(errMsg(e, 'Unable to load inquiry'));
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useViewFocus(() => { void load(); }, [load]);

  if (loading && !inq) return <ViewShell title="Add Costing"><Loader /></ViewShell>;
  if (!inq) return <ViewShell title="Add Costing"><ErrorBox text={error || 'Inquiry not found'} onRetry={load} /></ViewShell>;

  const total = rows.length;
  const completed = rows.filter((r) => rowState(r).done).length;
  const awaiting = rows.filter((r) => r.sheet?.auth_status === 'awaiting_auth').length;
  const rejected = rows.filter((r) => r.sheet?.auth_status === 'rejected').length;
  const pending = rows.filter((r) => !rowState(r).done && r.sheet?.auth_status !== 'awaiting_auth').length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const summary = [
    pending ? `${pending} pending` : '',
    awaiting ? `${awaiting} awaiting auth` : '',
    rejected ? `${rejected} rejected` : '',
  ].filter(Boolean).join(' · ') || 'All complete';

  return (
    <ViewShell title="Add Costing" subtitle={`${inq.inquiry_no} · ${inq.party_name}`} maxWidth={1000}>
      <View style={s.progress}>
        <View style={{ flex: 1 }}>
          <Text style={s.progTitle}>{completed} of {total} {dsnWord(prptype, true)} approved</Text>
          <Text style={s.progSub}>{summary}</Text>
          <View style={s.progTrack}><View style={[s.progFill, { width: `${pct}%` }]} /></View>
        </View>
        <View style={s.progCircle}><Text style={s.progPct}>{pct}%</Text></View>
      </View>

      <Banner tone="info" icon="lightbulb-outline" text={`Each ${dsnWord(prptype)} needs its own cost. Tap any ${dsnWord(prptype)} below to add or view its costing.`} />
      {!!error && <ErrorBox text={error} onRetry={load} />}

      <View style={[wide && s.grid]}>
        {rows.map((r, idx) => {
          const st = rowState(r);
          const cs = r.sheet;
          return (
            <TouchableOpacity
              key={r.d.id}
              activeOpacity={0.75}
              style={[s.dCard, wide && s.gridItem]}
              onPress={() => nav.push({ name: 'costSheet', inquiryId: inq.id, designId: r.d.id })}
            >
              <View style={s.dHead}>
                <View style={s.dNo}><Text style={s.dNoText}>{idx + 1}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.dName} numberOfLines={1}>{r.d.design_name}</Text>
                  <Text style={s.dMeta}>
                    {formatQty(r.d.quantity)} {r.d.unit}{r.d.shades?.length ? ` · ${r.d.shades.length} shades` : ''}
                  </Text>
                </View>
                <Pill label={st.label} fg={st.fg} bg={st.bg} />
              </View>
              {!!r.d.construction_remarks && <Text style={s.construction} numberOfLines={2}>{r.d.construction_remarks}</Text>}
              {!!cs && num(cs.sale_rate) > 0 && (
                <View style={s.stats}>
                  <MiniStat label="Sale Rate" value={formatCurrency(cs.sale_rate)} />
                  <MiniStat label="Total Cost" value={formatCurrency(cs.total_cost)} />
                  <MiniStat label="GM" value={`${cs.gross_margin_pct}%`} color={gmColor(num(cs.gross_margin_pct))} />
                </View>
              )}
              {!cs && r.d.costing_method === 'simple' && r.d.is_costed && (
                <View style={s.stats}><MiniStat label="Simple Cost" value={formatCurrency(r.d.cost_per_mtr || 0)} /></View>
              )}
              {cs?.auth_status === 'rejected' && !!cs.rejection_reason && (
                <Text style={s.reject}>⚠ Rejected: {cs.rejection_reason}</Text>
              )}
              <View style={s.dAction}>
                <Text style={s.dActionText}>{st.action}</Text>
                <Icon name="arrow-forward" size={15} color={T.copper} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {completed === total && total > 0 && (
        <Card style={{ borderColor: T.green, backgroundColor: `${T.green}0D` }}>
          <Text style={[s.progTitle, { color: T.green }]}>✓ All {dsnWord(prptype, true)} costed</Text>
          <Text style={[s.progSub, { color: T.green }]}>All cost sheets approved. You can now send the quotation to the party.</Text>
          <Btn title="Back to Inquiry" icon="arrow-back" onPress={nav.back} style={{ marginTop: 10 }} />
        </Card>
      )}
    </ViewShell>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={[s.mini, !!color && { backgroundColor: `${color}14` }]}>
      <Text style={[s.miniLbl, !!color && { color }]}>{label}</Text>
      <Text style={[s.miniVal, !!color && { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Cost sheet of one design / item                                            */
/* -------------------------------------------------------------------------- */

type Tab = 'simple' | 'sheet';

export function CostSheetView({ inquiryId, designId }: { inquiryId: number; designId: number }) {
  const { api, prptype } = useInquiry();
  const nav = useInquiryNav();
  const { wide } = useWide();
  const sip = isSip(prptype);

  const [tab, setTab] = useState<Tab>(sip ? 'simple' : 'sheet');
  const [hasSheet, setHasSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [designName, setDesignName] = useState('');
  const [simpleRate, setSimpleRate] = useState('');
  const [simpleGst, setSimpleGst] = useState('5');
  const [sheet, setSheet] = useState<CostSheet>(() => defaultSheet(designId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [inq, existing] = await Promise.all([
          api.show(inquiryId),
          api.costSheet(inquiryId, designId).catch(() => null),
        ]);
        if (!alive) return;
        const d = inq.designs?.find((x) => Number(x.id) === Number(designId));
        if (d) {
          setDesignName(d.design_name);
          if (d.cost_per_mtr) {
            setSimpleRate(String(d.cost_per_mtr));
            setSimpleGst(String(d.gst_percent));
          }
        }
        if (existing) {
          setSheet(existing);
          setHasSheet(true);
          setTab('sheet');
        }
      } catch (e) {
        if (alive) setError(errMsg(e, 'Unable to load costing'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [api, inquiryId, designId]);

  const upd = (patch: Partial<CostSheet>) => setSheet((prev) => recompute({ ...prev, ...patch }));
  const readonly = sheetLocked(sheet);

  const saveDraft = async () => {
    setSaving(true);
    try {
      const saved = await api.saveCostSheet(inquiryId, designId, sheet);
      if (saved) setSheet(saved);
      AppAlert.alert('Saved', 'Cost sheet saved as draft', [{ text: 'OK', onPress: () => nav.back() }]);
    } catch (e) {
      AppAlert.alert('Error', errMsg(e, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const submitForAuth = () => {
    if (!sheet.sale_rate || sheet.sale_rate <= 0) {
      AppAlert.alert('Missing', 'Please enter sale rate before submitting');
      return;
    }
    AppAlert.alert(
      'Submit for authorization?',
      `Total cost: ${formatCurrency(sheet.total_cost)}\nSale rate: ${formatCurrency(sheet.sale_rate)}\nGM: ${sheet.gross_margin_pct}%\n\nOnce submitted, you cannot edit until approved or rejected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await api.saveCostSheet(inquiryId, designId, sheet); // save first, then submit
              const submitted = await api.submitCostSheet(inquiryId, designId);
              if (submitted) setSheet(submitted);
              AppAlert.alert('Submitted', 'Cost sheet sent for authorization', [{ text: 'OK', onPress: () => nav.back() }]);
            } catch (e) {
              AppAlert.alert('Error', errMsg(e, 'Failed to submit'));
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const submitSimple = async () => {
    const rate = parseFloat(simpleRate);
    if (!rate || rate <= 0) { AppAlert.alert('Missing', 'Enter a valid rate'); return; }
    setSubmitting(true);
    try {
      await api.submitCosting(inquiryId, [{ inquiry_design_id: designId, cost_per_mtr: rate, gst_percent: parseFloat(simpleGst) || 5 }]);
      AppAlert.alert('Saved', 'Simple costing submitted', [{ text: 'OK', onPress: () => nav.back() }]);
    } catch (e) {
      AppAlert.alert('Error', errMsg(e, 'Failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ViewShell title="Costing"><Loader label="Loading costing…" /></ViewShell>;

  const tabs: Tab[] = sip ? (hasSheet ? ['simple', 'sheet'] : ['simple']) : ['sheet'];
  const showSheet = tab === 'sheet' || !sip;
  const gm = num(sheet.gross_margin_pct);

  return (
    <ViewShell
      title={designName || 'Costing'}
      subtitle={showSheet ? `Cost sheet · ${SHEET_META[sheet.auth_status]?.label ?? 'Draft'}` : 'Simple costing'}
      maxWidth={1000}
      footer={showSheet && !readonly ? (
        <View style={s.footer}>
          <View style={[s.footerInner, wide && { maxWidth: 1000 }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.footLbl}>GM · TOTAL COST {formatCurrency(sheet.total_cost)}</Text>
              <Text style={[s.footVal, { color: gmColor(gm) }]}>{formatCurrency(sheet.gross_margin_amount)} · {gm}%</Text>
            </View>
            <Btn title="Save Draft" variant="secondary" onPress={saveDraft} loading={saving} disabled={submitting} />
            <Btn title="Submit for Auth" icon="send" variant="accent" onPress={submitForAuth} loading={submitting} disabled={saving} />
          </View>
        </View>
      ) : null}
    >
      {!!error && <ErrorBox text={error} />}

      {tabs.length > 1 && (
        <View style={s.tabs}>
          {tabs.map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]} activeOpacity={0.75}>
              <Text style={[s.tabText, tab === t && { color: '#fff' }]}>{t === 'simple' ? 'Simple Costing' : 'Cost Sheet'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showSheet && sheet.auth_status === 'awaiting_auth' && (
        <Banner tone="warn" icon="hourglass-top" title="Awaiting Authorization" text="This cost sheet has been submitted. You'll be notified once approved." />
      )}
      {showSheet && sheet.auth_status === 'approved' && (
        <Banner tone="success" icon="check-circle" title="Approved" text={`Approved by ${sheet.authorized_by_name || 'authorizer'}`} />
      )}
      {showSheet && sheet.auth_status === 'rejected' && (
        <Banner
          tone="danger"
          icon="cancel"
          title={`Rejected: ${sheet.rejection_reason || ''}`}
          text={[sheet.rejection_remarks, 'Please review and resubmit.'].filter(Boolean).join('\n')}
        />
      )}

      {!showSheet ? (
        <Card title="Simple rate entry">
          <Text style={s.hint}>Just enter cost per unit + GST. Use this for quick quotations without detailed breakdown. No authorization needed.</Text>
          <View style={s.row2}>
            <Field label="Cost per unit" required value={simpleRate} onChangeText={setSimpleRate} keyboardType="decimal-pad" placeholder="0.00" style={{ flex: 2 }} big />
            <Field label="GST %" value={simpleGst} onChangeText={setSimpleGst} keyboardType="decimal-pad" placeholder="5" style={{ flex: 1 }} big />
          </View>
          <Btn title="Submit Simple Costing" icon="check" variant="accent" onPress={submitSimple} loading={submitting} />
        </Card>
      ) : (
        <View style={[wide && s.cols]}>
          <View style={[wide && { flex: 1, minWidth: 0 }]}>
            <Card title="Reference">
              <Field
                label={`Quantity (${sheet.quantity_unit || 'KGS'})`}
                editable={!readonly}
                value={sheet.total_quantity ? String(sheet.total_quantity) : ''}
                onChangeText={(t) => upd({ total_quantity: parseFloat(t) || 0 })}
                keyboardType="decimal-pad"
                placeholder="1000"
              />
              <Field label="Quality" editable={!readonly} value={sheet.quality || ''} onChangeText={(t) => upd({ quality: t })} placeholder='PLAIN INTERLOK FULL DULL-200/62"' />
              <Field label="Knitter (from party master)" editable={!readonly} value={sheet.knitter_name || ''} onChangeText={(t) => upd({ knitter_name: t })} placeholder="Knitter name" />
              <Field label="Mill name" editable={!readonly} value={sheet.mill_name || ''} onChangeText={(t) => upd({ mill_name: t })} placeholder="LAXMINARAYAN IND ESTATE" />
              <Field label="Shades dyed" editable={!readonly} value={sheet.shades_dyed || ''} onChangeText={(t) => upd({ shades_dyed: t })} placeholder="Black, Navy Blue, Maroon..." style={{ marginBottom: 0 }} />
            </Card>

            <Card title="Greige & Purchase">
              <NumRow label="Greige rate" value={sheet.greige_rate} onChange={(v) => upd({ greige_rate: v })} readonly={readonly} />
              <NumRow label="Purchase" value={sheet.purchase} onChange={(v) => upd({ purchase: v })} readonly={readonly} />
              <PctRow label="Brokerage" pct={sheet.brokerage} amount={brokerageAmount(sheet)} onChange={(v) => upd({ brokerage: v })} readonly={readonly} />
              <NumRow label="Freight" value={sheet.freight} onChange={(v) => upd({ freight: v })} readonly={readonly} last />
            </Card>

            <Card title="Dyeing & Processing">
              <PctRow label="Dyeing shortage" pct={sheet.dyeing_shortage_pct} amount={sheet.dyeing_shortage_amount} onChange={(v) => upd({ dyeing_shortage_pct: v })} readonly={readonly} />
              <NumRow label="Dyeing charge" value={sheet.dyeing_charge} onChange={(v) => upd({ dyeing_charge: v })} readonly={readonly} />
              <NumRow label="Value add" value={sheet.value_add} onChange={(v) => upd({ value_add: v })} readonly={readonly} />
              <NumRow label="Packaging charge" value={sheet.packaging_charge} onChange={(v) => upd({ packaging_charge: v })} readonly={readonly} last />
            </Card>
          </View>

          <View style={[wide && { flex: 1, minWidth: 0 }]}>
            <Card title="Overheads & Hidden">
              <NumRow label="Overheads" value={sheet.overheads_exp} onChange={(v) => upd({ overheads_exp: v })} readonly={readonly} />
              <Field editable={!readonly} value={sheet.overheads_basis || ''} onChangeText={(t) => upd({ overheads_basis: t })} placeholder="e.g., AS PER 35 TONS MONTHLY" style={{ marginTop: 6 }} />
              <PctRow label="Hidden cost" pct={sheet.hidden_cost_pct} amount={sheet.hidden_cost_amount} onChange={(v) => upd({ hidden_cost_pct: v })} readonly={readonly} />
              <PctRow label="Sale discount" pct={sheet.sale_discount_pct} amount={sheet.sale_discount_amount} onChange={(v) => upd({ sale_discount_pct: v })} readonly={readonly} last />
            </Card>

            <Card title="Sale">
              <PctRow label="Sale brokerage" pct={sheet.sale_brokerage_pct} amount={sheet.sale_brokerage_amount} onChange={(v) => upd({ sale_brokerage_pct: v })} readonly={readonly} />
              <View style={s.totalRow}>
                <Text style={s.totalLbl}>Total cost</Text>
                <Text style={s.totalVal}>{formatCurrency(sheet.total_cost)}</Text>
              </View>
              <Field
                label="Sale rate (final selling price)"
                required
                editable={!readonly}
                value={sheet.sale_rate ? String(sheet.sale_rate) : ''}
                onChangeText={(t) => upd({ sale_rate: parseFloat(t) || 0 })}
                keyboardType="decimal-pad"
                placeholder="270"
                big
                style={{ marginBottom: 0 }}
              />
            </Card>

            <View style={[s.gm, { backgroundColor: gmBg(gm), borderColor: gmColor(gm) }]}>
              <View>
                <Text style={[s.gmLbl, { color: gmColor(gm) }]}>GROSS MARGIN</Text>
                <Text style={[s.gmAmt, { color: gmColor(gm) }]}>{formatCurrency(sheet.gross_margin_amount)}</Text>
              </View>
              <Text style={[s.gmPct, { color: gmColor(gm) }]}>{gm}%</Text>
            </View>

            <Card title="Payment term & remarks">
              <Field editable={!readonly} value={sheet.payment_term || ''} onChangeText={(t) => upd({ payment_term: t })} placeholder="e.g., 30% advance, 70% on delivery" multiline label="Payment term" />
              <Field editable={!readonly} value={sheet.cost_remarks || ''} onChangeText={(t) => upd({ cost_remarks: t })} placeholder="Any internal notes" multiline label="Remarks" style={{ marginBottom: 0 }} />
            </Card>

            {!readonly && (
              <Banner tone="warn" icon="info-outline" text="This cost sheet requires authorization before the inquiry can move forward." />
            )}
          </View>
        </View>
      )}
    </ViewShell>
  );
}

/** Numeric row — keeps the typed text (so "12." stays), empty = 0. */
function NumRow({ label, value, onChange, readonly, last }: {
  label: string; value: number; onChange: (v: number) => void; readonly?: boolean; last?: boolean;
}) {
  const [text, setText] = useState(value ? String(value) : '');
  useEffect(() => {
    setText((cur) => (parseFloat(cur || '0') === num(value) ? cur : value ? String(value) : ''));
  }, [value]);
  return (
    <View style={[s.kvRow, !last && s.kvLine]}>
      <Text style={s.kvLbl}>{label}</Text>
      <TextInput
        editable={!readonly}
        value={text}
        onChangeText={(t) => { setText(t); onChange(parseFloat(t) || 0); }}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={T.muted}
        style={[s.kvInput, readonly && s.kvInputRo]}
      />
    </View>
  );
}

function PctRow({ label, pct, amount, onChange, readonly, last }: {
  label: string; pct: number; amount: number; onChange: (v: number) => void; readonly?: boolean; last?: boolean;
}) {
  const [text, setText] = useState(pct ? String(pct) : '');
  useEffect(() => {
    setText((cur) => (parseFloat(cur || '0') === num(pct) ? cur : pct ? String(pct) : ''));
  }, [pct]);
  return (
    <View style={[s.kvRow, !last && s.kvLine]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.kvLbl}>{label}</Text>
        <Text style={s.kvSub}>{formatCurrency(amount)}</Text>
      </View>
      <View style={s.pctBox}>
        <TextInput
          editable={!readonly}
          value={text}
          onChangeText={(t) => { setText(t); onChange(parseFloat(t) || 0); }}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={T.muted}
          style={[s.kvInput, { width: 70 }, readonly && s.kvInputRo]}
        />
        <Text style={s.pctSign}>%</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  progress: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.nav, borderRadius: 14, padding: 14, marginBottom: 10,
  },
  progTitle: { fontSize: 14, fontWeight: '900', color: '#fff' },
  progSub: { fontSize: 11.5, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  progTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 8, overflow: 'hidden' },
  progFill: { height: 5, borderRadius: 3, backgroundColor: T.copper },
  progCircle: { width: 54, height: 54, borderRadius: 27, borderWidth: 3, borderColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  progPct: { color: '#fff', fontSize: 14, fontWeight: '900', fontFamily: MONO },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { flexBasis: '48%', flexGrow: 1 },
  dCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  dHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dNo: { width: 28, height: 28, borderRadius: 14, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  dNoText: { fontSize: 12, fontWeight: '900', color: T.ink },
  dName: { fontSize: 14, fontWeight: '900', color: T.ink },
  dMeta: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  construction: { fontSize: 11.5, fontWeight: '600', color: T.muted, fontStyle: 'italic', marginTop: 7 },
  stats: { flexDirection: 'row', gap: 6, marginTop: 9 },
  mini: { flex: 1, backgroundColor: T.sub, borderRadius: 8, padding: 7 },
  miniLbl: { fontSize: 9.5, fontWeight: '900', color: T.muted },
  miniVal: { fontSize: 12, fontWeight: '900', color: T.ink, fontFamily: MONO, marginTop: 2 },
  reject: { fontSize: 11.5, fontWeight: '800', color: T.red, marginTop: 8 },
  dAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 9 },
  dActionText: { fontSize: 12.5, fontWeight: '900', color: T.copper },

  tabs: { flexDirection: 'row', gap: 6, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 11, padding: 3, marginBottom: 10 },
  tab: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: T.nav },
  tabText: { fontSize: 12.5, fontWeight: '900', color: T.ink },
  hint: { fontSize: 12, fontWeight: '600', color: T.muted, marginBottom: 10, lineHeight: 17 },
  row2: { flexDirection: 'row', gap: 10 },
  cols: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },

  kvRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  kvLine: { borderBottomWidth: 1, borderBottomColor: T.hair },
  kvLbl: { flex: 1, fontSize: 13, fontWeight: '700', color: T.ink },
  kvSub: { fontSize: 10.5, fontWeight: '700', color: T.muted, fontFamily: MONO, marginTop: 1 },
  kvInput: {
    width: 120, height: 38, borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface,
    paddingHorizontal: 9, fontSize: 13, fontWeight: '800', color: T.ink, fontFamily: MONO, textAlign: 'right',
  },
  kvInputRo: { backgroundColor: T.sub, color: T.muted },
  pctBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pctSign: { fontSize: 13, fontWeight: '900', color: T.muted },
  totalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.sub,
    borderRadius: 9, padding: 10, marginVertical: 8,
  },
  totalLbl: { fontSize: 13, fontWeight: '900', color: T.ink },
  totalVal: { fontSize: 15, fontWeight: '900', color: T.ink, fontFamily: MONO },
  gm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  gmLbl: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  gmAmt: { fontSize: 18, fontWeight: '900', fontFamily: MONO, marginTop: 2 },
  gmPct: { fontSize: 26, fontWeight: '900', fontFamily: MONO },

  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, width: '100%', alignSelf: 'center', flexWrap: 'wrap' },
  footLbl: { fontSize: 9, fontWeight: '900', color: T.muted, letterSpacing: 0.4 },
  footVal: { fontSize: 15, fontWeight: '900', fontFamily: MONO },
});
