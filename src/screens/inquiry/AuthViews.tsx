// FILE: src/screens/inquiry/AuthViews.tsx
// Cost-sheet authorization (legacy AuthQueueScreen + AuthReviewScreen).
//   GET  /api/auth/pending-cost-sheets                        queue + counts
//   GET  /api/inquiries/{id}/designs/{designId}/cost-sheet     review
//   POST .../cost-sheet/approve                                 approve
//   POST .../cost-sheet/reject  { reason, remarks }             reject
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useInquiry, useInquiryNav, useViewFocus } from './InquiryContext';
import {
  AuthQueueItem,
  COST_SHEET_REJECT_REASONS,
  CostSheet,
  errMsg,
  formatCurrency,
  formatQty,
  gmBg,
  gmColor,
  num,
  relativeTime,
  SHEET_META,
} from './inquiryModel';
import { Banner, Btn, Card, EmptyState, ErrorBox, Field, KV, Loader, MONO, Pill, RadioList, useWide, ViewShell } from './ui';

export function AuthQueueView() {
  const { api, refreshAuth } = useInquiry();
  const nav = useInquiryNav();
  const { wide } = useWide();
  const [items, setItems] = useState<AuthQueueItem[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.authQueue();
      setItems(res.data);
      setCounts(res.counts);
    } catch (e) {
      setError(errMsg(e, 'Unable to load queue'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useViewFocus(() => { void load(); void refreshAuth(); }, [load]);

  const header = (
    <View style={{ marginBottom: 6 }}>
      <View style={s.statBar}>
        <StatCell label="Pending" value={counts.pending} color={T.amber} />
        <StatCell label="Approved" value={counts.approved} color={T.green} />
        <StatCell label="Rejected" value={counts.rejected} color={T.red} />
      </View>
      {!!error && <ErrorBox text={error} onRetry={load} />}
    </View>
  );

  return (
    <ViewShell title="Authorization Queue" subtitle="Cost sheets waiting for approval" scroll={false}>
      {loading ? <Loader /> : (
        <FlatList
          key={wide ? 'w' : 'n'}
          data={items}
          numColumns={wide ? 2 : 1}
          columnWrapperStyle={wide ? { gap: 10 } : undefined}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={[s.list, wide && s.listWide]}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
          ListEmptyComponent={!error ? <EmptyState icon="verified" title="All caught up" subtitle="No cost sheets awaiting authorization" /> : null}
          renderItem={({ item }) => {
            const gm = num(item.gross_margin_pct);
            return (
              <TouchableOpacity
                style={[s.card, wide && { flex: 1 / 2 }]}
                activeOpacity={0.75}
                onPress={() => nav.push({ name: 'authReview', inquiryId: item.inquiry_id, designId: item.design_id })}
              >
                <View style={s.cardHead}>
                  <Text style={s.inqNo}>{item.inquiry_no}</Text>
                  <Pill label="awaiting" fg={T.amber} bg={`${T.amber}1A`} />
                </View>
                <Text style={s.party} numberOfLines={1}>{item.party_name}</Text>
                <Text style={s.sub} numberOfLines={1}>{item.design_name}</Text>
                <Text style={s.sub}>Qty: {formatQty(item.total_quantity)} {item.quantity_unit} · Submitted {relativeTime(item.submitted_at)}</Text>
                <View style={s.stats}>
                  <Mini label="Total cost" value={formatCurrency(item.total_cost)} />
                  <Mini label="Sale rate" value={formatCurrency(item.sale_rate)} />
                  <Mini label="GM" value={`${item.gross_margin_pct}%`} color={gmColor(gm)} />
                </View>
                {gm < 5 && <Banner tone="danger" icon="warning-amber" text="Low margin — review carefully" />}
                <View style={s.open}>
                  <Text style={s.openText}>Review full cost sheet</Text>
                  <Icon name="arrow-forward" size={15} color={T.copper} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </ViewShell>
  );
}

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.statCell}>
      <Text style={[s.statVal, { color }]}>{value ?? 0}</Text>
      <Text style={s.statLbl}>{label}</Text>
    </View>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={[s.mini, !!color && { backgroundColor: `${color}14` }]}>
      <Text style={[s.miniLbl, !!color && { color }]}>{label}</Text>
      <Text style={[s.miniVal, !!color && { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

export function AuthReviewView({ inquiryId, designId }: { inquiryId: number; designId: number }) {
  const { api, refreshAuth } = useInquiry();
  const nav = useInquiryNav();
  const { wide } = useWide();
  const [sheet, setSheet] = useState<CostSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      setSheet(await api.costSheet(inquiryId, designId));
    } catch (e) {
      setError(errMsg(e, 'Unable to load cost sheet'));
    } finally {
      setLoading(false);
    }
  }, [api, inquiryId, designId]);

  useEffect(() => { void load(); }, [load]);

  const done = (title: string, msg: string) => {
    void refreshAuth();
    AppAlert.alert(title, msg, [{ text: 'OK', onPress: () => nav.back() }]);
  };

  const approve = () => {
    if (!sheet) return;
    AppAlert.alert(
      'Approve this cost sheet?',
      `GM: ${sheet.gross_margin_pct}% (${formatCurrency(sheet.gross_margin_amount || 0)})\n\nOnce approved, the inquiry will move to "Costed".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessing(true);
            try {
              await api.approveCostSheet(inquiryId, designId);
              done('Approved', 'Cost sheet approved successfully');
            } catch (e) {
              AppAlert.alert('Error', errMsg(e, 'Failed'));
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  const reject = async () => {
    if (!reason) { AppAlert.alert('Select reason', 'Please select a rejection reason'); return; }
    setProcessing(true);
    try {
      await api.rejectCostSheet(inquiryId, designId, { reason, remarks });
      done('Rejected', 'Cost sheet rejected. Costing person notified.');
    } catch (e) {
      AppAlert.alert('Error', errMsg(e, 'Failed'));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <ViewShell title="Review Cost Sheet"><Loader /></ViewShell>;
  if (!sheet) return <ViewShell title="Review Cost Sheet"><ErrorBox text={error || 'Cost sheet not found'} onRetry={load} /></ViewShell>;

  const gm = num(sheet.gross_margin_pct);
  const meta = SHEET_META[sheet.auth_status] ?? SHEET_META.draft;

  return (
    <ViewShell title="Review Cost Sheet" subtitle={sheet.quality || meta.label} maxWidth={1000}>
      <View style={[s.gmHero, { backgroundColor: gmBg(gm), borderColor: gmColor(gm) }]}>
        <View>
          <Text style={[s.gmLbl, { color: gmColor(gm) }]}>GROSS MARGIN</Text>
          <Text style={[s.gmAmt, { color: gmColor(gm) }]}>{formatCurrency(sheet.gross_margin_amount)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[s.gmPct, { color: gmColor(gm) }]}>{gm}%</Text>
          <Pill label={meta.label} fg={meta.fg} bg={meta.bg} />
        </View>
      </View>

      <View style={[wide && s.cols]}>
        <View style={[wide && { flex: 1, minWidth: 0 }]}>
          <Card title="Reference">
            <KV k="SO No" v={sheet.so_no || '-'} />
            <KV k="Quality" v={sheet.quality || '-'} />
            <KV k="Quantity" v={`${sheet.total_quantity || 0} ${sheet.quantity_unit || ''}`} />
            <KV k="Knitter" v={sheet.knitter_name || '-'} />
            <KV k="Mill" v={sheet.mill_name || '-'} />
            <KV k="Shades" v={sheet.shades_dyed || '-'} last />
          </Card>
          <Card title="Greige & Purchase">
            <KV k="Greige rate" v={formatCurrency(sheet.greige_rate)} />
            <KV k="Purchase" v={formatCurrency(sheet.purchase)} />
            <KV k="Brokerage" v={formatCurrency(sheet.brokerage)} />
            <KV k="Freight" v={formatCurrency(sheet.freight)} last />
          </Card>
          <Card title="Dyeing & Processing">
            <KV k={`Dyeing shortage (${sheet.dyeing_shortage_pct}%)`} v={formatCurrency(sheet.dyeing_shortage_amount)} />
            <KV k="Dyeing charge" v={formatCurrency(sheet.dyeing_charge)} />
            <KV k="Value add" v={formatCurrency(sheet.value_add)} />
            <KV k="Packaging charge" v={formatCurrency(sheet.packaging_charge)} last />
          </Card>
        </View>
        <View style={[wide && { flex: 1, minWidth: 0 }]}>
          <Card title="Overheads & Hidden">
            <KV k="Overheads" v={formatCurrency(sheet.overheads_exp)} />
            {!!sheet.overheads_basis && <Text style={s.basis}>{sheet.overheads_basis}</Text>}
            <KV k={`Hidden cost (${sheet.hidden_cost_pct}%)`} v={formatCurrency(sheet.hidden_cost_amount)} />
            <KV k={`Sale discount (${sheet.sale_discount_pct}%)`} v={formatCurrency(sheet.sale_discount_amount)} last />
          </Card>
          <Card title="Sale">
            <KV k={`Sale brokerage (${sheet.sale_brokerage_pct}%)`} v={formatCurrency(sheet.sale_brokerage_amount)} />
            <KV k="Total cost" v={formatCurrency(sheet.total_cost)} strong />
            <KV k="Sale rate" v={formatCurrency(sheet.sale_rate)} strong color={T.copper} last />
          </Card>
          {!!sheet.payment_term && <Card title="Payment term"><Text style={s.body}>{sheet.payment_term}</Text></Card>}
          {!!sheet.cost_remarks && <Card title="Remarks"><Text style={s.body}>{sheet.cost_remarks}</Text></Card>}

          {sheet.auth_status === 'awaiting_auth' && !rejecting && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn title="Reject" icon="close" variant="danger" onPress={() => setRejecting(true)} style={{ flex: 1 }} />
              <Btn title="Approve" icon="check" variant="accent" onPress={approve} loading={processing} style={{ flex: 2 }} />
            </View>
          )}

          {rejecting && (
            <Card title="Rejection reason *" style={{ borderColor: `${T.red}66` }}>
              <RadioList options={COST_SHEET_REJECT_REASONS} value={reason} onChange={setReason} color={T.red} />
              <Field
                label="Additional remarks"
                value={remarks}
                onChangeText={setRemarks}
                multiline
                placeholder="Optional details for the costing person"
                style={{ marginTop: 10 }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn title="Cancel" variant="secondary" onPress={() => setRejecting(false)} style={{ flex: 1 }} />
                <Btn title="Confirm Reject" icon="close" variant="danger" onPress={reject} loading={processing} style={{ flex: 2 }} />
              </View>
            </Card>
          )}
        </View>
      </View>
    </ViewShell>
  );
}

const s = StyleSheet.create({
  list: { padding: 12, paddingBottom: 40 },
  listWide: { maxWidth: 1100, width: '100%', alignSelf: 'center', paddingHorizontal: 20 },
  statBar: {
    flexDirection: 'row', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, marginBottom: 10,
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statVal: { fontSize: 20, fontWeight: '900', fontFamily: MONO },
  statLbl: { fontSize: 10.5, fontWeight: '800', color: T.muted, marginTop: 2 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 },
  inqNo: { fontSize: 14, fontWeight: '900', color: T.ink, fontFamily: MONO },
  party: { fontSize: 13.5, fontWeight: '800', color: T.yd },
  sub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 6, marginVertical: 9 },
  mini: { flex: 1, backgroundColor: T.sub, borderRadius: 8, padding: 7 },
  miniLbl: { fontSize: 9.5, fontWeight: '900', color: T.muted },
  miniVal: { fontSize: 12, fontWeight: '900', color: T.ink, fontFamily: MONO, marginTop: 2 },
  open: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  openText: { fontSize: 12.5, fontWeight: '900', color: T.copper },
  cols: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  gmHero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  gmLbl: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  gmAmt: { fontSize: 20, fontWeight: '900', fontFamily: MONO, marginTop: 2 },
  gmPct: { fontSize: 28, fontWeight: '900', fontFamily: MONO },
  basis: { fontSize: 11.5, fontWeight: '600', color: T.muted, fontStyle: 'italic', paddingBottom: 6 },
  body: { fontSize: 13, fontWeight: '600', color: T.ink, lineHeight: 19 },
});
