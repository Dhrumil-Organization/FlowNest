import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DashboardAmountMode, formatSummaryAmount } from './AmountDisplayModeControl';
import { S, T } from '@/src/theme';
import DrilldownListTools, { useDrilldownList } from './DrilldownListTools';

export type OutstandingFutureReceipt = {
  source_group?: string;
  source_database?: string;
  prp_code?: string;
  party_code?: string;
  receipt_uid?: number | string;
  receipt_srno?: number | string;
  voucher_no?: string;
  posting_date?: number | string;
  effective_date?: number | string;
  amount?: number;
  amount_exact?: string;
  allocated_amount?: number;
  allocated_amount_exact?: string;
  unallocated_amount?: number;
  allocation_status?: 'ON_ACCOUNT' | 'FULLY_ALLOCATED' | 'PARTIALLY_ALLOCATED' | string;
};

export type OutstandingFutureReceiptSummary = {
  as_on_date?: number | string;
  amount?: number;
  amount_exact?: string;
  receipt_rows?: number;
  current_ledger_amount?: number;
  current_ledger_amount_exact?: string;
  historical_snapshot_verified?: boolean;
};

export type OutstandingFutureReceiptReport = {
  future_dated_receipt_summary?: OutstandingFutureReceiptSummary;
  future_dated_receipts?: OutstandingFutureReceipt[];
  future_dated_receipts_total?: number;
  future_dated_receipts_total_exact?: string;
};

export const formatOutstandingYmd = (value: number | string | undefined): string => {
  const input = String(value ?? '').trim();
  const plain = /^\d{4}-\d{2}-\d{2}$/.test(input) ? input.replace(/-/g, '') : input;
  if (!/^\d{8}$/.test(plain) || plain === '00000000') return 'Not specified';
  return `${plain.slice(6, 8)}-${plain.slice(4, 6)}-${plain.slice(0, 4)}`;
};

const statusLabel = (status: string | undefined): string => {
  if (status === 'ON_ACCOUNT') return 'On account';
  if (status === 'FULLY_ALLOCATED') return 'Fully allocated';
  if (status === 'PARTIALLY_ALLOCATED') return 'Partially allocated';
  return String(status || 'Allocation not specified').replace(/_/g, ' ');
};

/**
 * Read-only Outstanding party_detail drilldown. The Laravel endpoint must
 * provide future_dated_receipts; the frontend does not infer/account for
 * receipts or alter Outstanding totals.
 */
export default function FutureDatedReceiptsPanel({
  report,
  amountMode,
}: {
  report?: OutstandingFutureReceiptReport | null;
  amountMode: DashboardAmountMode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  const ready = Array.isArray(report?.future_dated_receipts);
  const receipts = useMemo(
    () => report?.future_dated_receipts || [],
    [report?.future_dated_receipts],
  );

  const tools = useDrilldownList(receipts, ['voucher_no', 'receipt_uid', 'receipt_srno', 'posting_date', 'effective_date', 'prp_code', 'allocation_status'], [
    { key: 'voucher_no', label: 'Voucher', type: 'text' },
    { key: 'effective_date', label: 'EDate', type: 'date' },
    { key: 'amount', label: 'Amount', type: 'number' },
  ], 'effective_date');

  // Do not display misleading zero amounts until the backend contract exists.
  if (!ready) return null;

  const amount = Number(report?.future_dated_receipts_total ?? 0);
  const asOn = report?.future_dated_receipt_summary?.as_on_date;
  const totalAllocated = receipts.reduce((sum, item) => sum + Number(item.allocated_amount || 0), 0);
  const totalUnallocated = receipts.reduce((sum, item) => sum + Number(item.unallocated_amount ?? (Number(item.amount || 0) - Number(item.allocated_amount || 0))), 0);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(open => !open)}
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityLabel={`Future-dated receipts, ${receipts.length} entries. ${expanded ? 'Collapse' : 'Expand'} details`}
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerCopy}>
          <View style={styles.kickerRow}>
            <View style={styles.dot} />
            <Text style={styles.kicker}>FUTURE-DATED RECEIPTS</Text>
          </View>
          <Text style={styles.title}>Receipts effective after report date</Text>
          <Text style={styles.subtitle}>
            {receipts.length} entr{receipts.length === 1 ? 'y' : 'ies'}
            {asOn ? ` · Outstanding as on ${formatOutstandingYmd(asOn)}` : ''}
          </Text>
        </View>
        <View style={styles.totalWrap}>
          <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>
            {formatSummaryAmount(amount, amountMode, report?.future_dated_receipts_total_exact)}
          </Text>
          <Text style={styles.chevron}>{expanded ? 'HIDE  ▲' : 'DETAILS  ▼'}</Text>
        </View>
      </TouchableOpacity>
      {expanded ? (
        <View>
          <View style={styles.explainer}>
            <Text style={styles.explainerText}>
              These receipts are posted in the ledger but have an effective date after the selected Outstanding date.
              Their amounts have already been added back to the Outstanding shown above; they must not be deducted again.
            </Text>
          </View>
          {receipts.length === 0 ? (
            <Text style={styles.empty}>No future-effective receipt entries for this party.</Text>
          ) : (
            <>
              <DrilldownListTools state={tools} placeholder="Search voucher no., posting date or EDate" compact showCount />
              <View style={styles.columnHeading}>
                <Text style={styles.columnText}>RECEIPT / EFFECTIVE DATE</Text>
                <Text style={styles.columnText}>AMOUNT</Text>
              </View>
              {tools.rows.map((receipt, index) => {
                const key = `${receipt.source_database || receipt.source_group || ''}:${receipt.receipt_uid ?? index}:${receipt.receipt_srno ?? ''}`;
                const isOpen = Boolean(detailsOpen[key]);
                return (
                  <View key={key} style={styles.entry}>
                    <TouchableOpacity
                      style={styles.entryTop}
                      onPress={() => setDetailsOpen(old => ({ ...old, [key]: !old[key] }))}
                      activeOpacity={0.72}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                      accessibilityLabel={`${receipt.voucher_no || 'Receipt'} ${statusLabel(receipt.allocation_status)}, ${isOpen ? 'collapse' : 'show'} allocation details`}
                    >
                      <View style={styles.entryInfo}>
                        <View style={styles.voucherRow}>
                          <Text style={styles.voucher} numberOfLines={1}>
                            {receipt.voucher_no || `Receipt ${index + 1}`}{receipt.receipt_srno != null ? ` / ${receipt.receipt_srno}` : ''}
                          </Text>
                          <Text style={styles.property}>{receipt.prp_code || receipt.source_group || ''}</Text>
                        </View>
                        <Text style={styles.entryMeta}>EDate: {formatOutstandingYmd(receipt.effective_date)}</Text>
                        <Text style={styles.postedMeta}>Posted: {formatOutstandingYmd(receipt.posting_date)} · {statusLabel(receipt.allocation_status)}</Text>
                      </View>
                      <View style={styles.entryRight}>
                        <Text style={styles.entryAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                          {formatSummaryAmount(receipt.amount, amountMode, receipt.amount_exact)}
                        </Text>
                        <Text style={styles.entryChevron}>{isOpen ? '▲' : '▼'}</Text>
                      </View>
                    </TouchableOpacity>
                    {isOpen ? (
                      <View style={styles.entryDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Allocated to invoices</Text>
                          <Text style={styles.detailValue}>{formatSummaryAmount(receipt.allocated_amount, amountMode, receipt.allocated_amount_exact)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>On account / not allocated</Text>
                          <Text style={styles.detailValue}>{formatSummaryAmount(receipt.unallocated_amount ?? (Number(receipt.amount || 0) - Number(receipt.allocated_amount || 0)), amountMode)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Receipt UID / row</Text>
                          <Text style={styles.detailText}>{receipt.receipt_uid ?? '—'} / {receipt.receipt_srno ?? '—'}</Text>
                        </View>
                        {receipt.source_database ? (
                          <Text style={styles.database}>Source: {receipt.source_database} · {receipt.prp_code || receipt.source_group || ''}</Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}
              <View style={styles.breakdown}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Allocated receipts</Text>
                  <Text style={styles.detailValue}>{formatSummaryAmount(totalAllocated, amountMode)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>On-account receipts</Text>
                  <Text style={styles.detailValue}>{formatSummaryAmount(totalUnallocated, amountMode)}</Text>
                </View>
              </View>
            </>
          )}
          <View style={styles.footer}>
            <Text style={styles.footerLabel}>TOTAL FUTURE RECEIPTS</Text>
            <Text style={styles.footerValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
              {formatSummaryAmount(amount, amountMode, report?.future_dated_receipts_total_exact)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 17, overflow: 'hidden', ...S.card },
  header: { paddingHorizontal: 14, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  headerCopy: { flex: 1, minWidth: 0 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#B85C00' },
  kicker: { color: '#B85C00', fontSize: 8, fontWeight: '900', letterSpacing: 0.55 },
  title: { color: T.ink, fontSize: 14, fontWeight: '900', marginTop: 5 },
  subtitle: { color: T.muted, fontSize: 9, marginTop: 4, lineHeight: 14 },
  totalWrap: { alignItems: 'flex-end', maxWidth: '44%', minWidth: 92 },
  totalAmount: { color: '#B85C00', fontSize: 15, fontWeight: '900', textAlign: 'right', fontVariant: ['tabular-nums'] },
  chevron: { marginTop: 6, color: T.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.35 },
  explainer: { backgroundColor: '#FFF6E9', borderTopWidth: 1, borderTopColor: '#F0DFC8', paddingHorizontal: 14, paddingVertical: 10 },
  explainerText: { color: '#855B2A', fontSize: 10, lineHeight: 16 },
  empty: { color: T.muted, padding: 16, fontSize: 11 },
  columnHeading: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: T.alt, borderTopWidth: 1, borderTopColor: T.hair },
  columnText: { fontSize: 8, fontWeight: '900', color: T.muted, letterSpacing: 0.6 },
  entry: { borderTopWidth: 1, borderTopColor: T.hair },
  entryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  entryInfo: { flex: 1, minWidth: 0 },
  voucherRow: { flexDirection: 'row', gap: 7, alignItems: 'center', flexWrap: 'wrap' },
  voucher: { color: T.ink, fontSize: 11, fontWeight: '900', maxWidth: '78%' },
  property: { color: '#B85C00', fontSize: 8, fontWeight: '800', backgroundColor: '#FFF0DF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden' },
  entryMeta: { color: T.ink, fontSize: 10, fontWeight: '800', marginTop: 5 },
  postedMeta: { color: T.muted, fontSize: 9, lineHeight: 13, marginTop: 3 },
  entryRight: { alignItems: 'flex-end', maxWidth: '42%' },
  entryAmount: { color: '#B85C00', fontSize: 12, fontWeight: '900', textAlign: 'right', fontVariant: ['tabular-nums'] },
  entryChevron: { color: T.muted, fontSize: 8, marginTop: 6 },
  entryDetails: { backgroundColor: T.alt, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  detailLabel: { color: T.muted, fontSize: 9, flex: 1 },
  detailValue: { color: T.ink, fontSize: 10, fontWeight: '900', textAlign: 'right' },
  detailText: { color: T.ink, fontSize: 9, textAlign: 'right' },
  database: { color: T.muted, fontSize: 8, marginTop: 1 },
  breakdown: { paddingHorizontal: 14, paddingVertical: 13, gap: 10, borderTopWidth: 1, borderTopColor: T.hair },
  footer: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.alt, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  footerLabel: { color: T.nav, fontSize: 9, fontWeight: '900', flex: 1 },
  footerValue: { color: '#B85C00', fontSize: 13, fontWeight: '900', maxWidth: '55%', textAlign: 'right' },
});
