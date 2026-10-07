// FILE: src/components/OutstandingNEW/DetailPanel.tsx
// Bill details of one account (legacy: the "… summary > details" overlay with
// DetailTable / OnAccountDetailTable).
//   - rows   : details whose ACCCODE equals the tapped account, then the search
//              (every value of a row), exactly as legacy
//   - bills  : Type, Date, Vou. No., Balance, Due Days, Cumulative. The running
//              "Cumulative" is built oldest -> newest and shown newest -> oldest
//              (Receivables by TRANID, Payable by NTRANDATE + TRANID)
//   - "On Account" card: Chq. No., Chq. Date, Remark, Clr. Date, Amount
//   - Totals : Balance + Cumulative (bills) / Amount (on account)
import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { S, T } from '@/src/theme';
import { EmptyState, PanelHeader, SearchBox } from '@/src/components/erpUi';
import {
  DetailKind,
  Row,
  Variant,
  columnTotals,
  detailColumns,
  detailKindOf,
  detailsOfAccount,
  filterRows,
  money2,
  withCumulative,
} from './model';
import { CONTENT_W, Cell, DataTable, TotalsStrip, ViewMode, ViewToggle, useLayout } from './ui';

type Props = {
  variant: Variant;
  card: Row | null;
  account: Row;
  details: Row[];
  search: string;
  onSearch: (t: string) => void;
  mode: ViewMode | null;
  onMode: (m: ViewMode) => void;
  onBack: () => void;
};

const text = (v: any) => (v === undefined || v === null || String(v).trim() === '' ? '—' : String(v));

const BillCard = memo(function BillCard({ row, kind }: { row: Row; kind: DetailKind }) {
  if (kind === 'onaccount') {
    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.cardLabel}>CHQ. NO.</Text>
            <Text style={s.cardTitle} numberOfLines={1}>{text(row.chqno)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.cardLabel}>AMOUNT</Text>
            <Text style={s.cardAmount} numberOfLines={1}>₹ {money2(row.AMOUNT)}</Text>
          </View>
        </View>
        <View style={s.cardRow}>
          <Cell label="Chq. Date" value={text(row.chqdate)} style={s.half} />
          <Cell label="Clr. Date" value={text(row.clrdate)} style={s.half} />
        </View>
        <Text style={s.remark} numberOfLines={3}>
          <Text style={s.remarkLabel}>Remark: </Text>
          {text(row.remark)}
        </Text>
      </View>
    );
  }
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.typePill}>
          <Text style={s.typeText} numberOfLines={1}>{text(row.TYPE)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.cardTitle} numberOfLines={1}>{text(row.VOUNO)}</Text>
          <Text style={s.cardSub} numberOfLines={1}>{text(row.TRANDATE)}</Text>
        </View>
        <View style={s.duePill}>
          <Text style={s.dueText} numberOfLines={1}>Due days {text(row.DUEDAY)}</Text>
        </View>
      </View>
      <View style={s.cardRow}>
        <Cell label="Balance" value={`₹ ${money2(row.CUMBAL)}`} style={s.half} />
        <Cell label="Cumulative" value={`₹ ${money2(row.Cumulative)}`} color={T.nav} style={[s.half, { alignItems: 'flex-end' }]} />
      </View>
    </View>
  );
});

export default function DetailPanel({ variant, card, account, details, search, onSearch, mode, onMode, onBack }: Props) {
  const L = useLayout();
  const caption = card?.caption;
  const kind = detailKindOf(caption);
  const columns = useMemo(() => detailColumns(kind), [kind]);

  const data = useMemo(() => {
    const rows = filterRows(detailsOfAccount(details, account.AccCode), search);
    return kind === 'bills' ? withCumulative(variant, rows) : rows;
  }, [details, account.AccCode, search, kind, variant]);
  const totals = useMemo(() => columnTotals(columns, data), [columns, data]);

  const view: ViewMode = mode || (L.isPhone ? 'cards' : 'table');
  const cols = L.isPhone ? 1 : L.isDesktop ? 3 : 2;
  const keyOf = useCallback((item: Row, index: number) => `${item.ACCCODE}-${index}`, []);

  const countWord = kind === 'onaccount' ? (data.length === 1 ? 'entry' : 'entries') : data.length === 1 ? 'bill' : 'bills';

  const empty = (
    <EmptyState icon="receipt-long" title="No detail found" text={search ? 'Nothing matches this search.' : 'There is no bill for this account in this card.'} />
  );

  return (
    <View style={s.root}>
      <PanelHeader
        onBack={onBack}
        crumbs={[variant.title, `${caption ?? ''} summary`, 'Details']}
        title={String(account.AccName ?? 'Details')}
        subtitle={`Code ${account.AccCode ?? '—'} · ${data.length} ${countWord}`}
        right={<ViewToggle value={view} onChange={onMode} />}
      />
      <View style={s.searchBar}>
        <View style={[s.inner, { paddingHorizontal: L.gutter }]}>
          <SearchBox value={search} onChangeText={onSearch} placeholder="Search details..." />
        </View>
      </View>

      {view === 'table' ? (
        <View style={[s.inner, s.fill, { padding: L.gutter }]}>
          <DataTable columns={columns} rows={data} totals={totals} keyOf={keyOf} empty={empty} />
        </View>
      ) : (
        <FlatList
          key={`cards-${cols}`}
          data={data}
          numColumns={cols}
          keyExtractor={keyOf}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={14}
          windowSize={9}
          contentContainerStyle={[s.inner, { paddingHorizontal: L.gutter - 5, paddingTop: 10, paddingBottom: 24 }]}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 5, paddingBottom: 6 }}>
              <TotalsStrip columns={columns} totals={totals} count={data.length} countLabel={kind === 'onaccount' ? 'Entries' : 'Bills'} />
            </View>
          }
          ListEmptyComponent={empty}
          renderItem={({ item }) => (
            <View style={{ width: `${100 / cols}%` as any, padding: 5 }}>
              <BillCard row={item} kind={kind} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: T.bg, zIndex: 30, elevation: 30 },
  inner: { width: '100%', maxWidth: CONTENT_W, alignSelf: 'center' },
  fill: { flex: 1 },
  searchBar: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border, paddingVertical: 10 },

  card: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    gap: 10,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardLabel: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
  cardSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  cardAmount: { fontSize: 15, fontWeight: '900', color: T.nav },
  cardRow: {
    flexDirection: 'row',
    backgroundColor: T.sub,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.hair,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  half: { width: '50%' },
  typePill: {
    minWidth: 48,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${T.blue}14`,
    borderWidth: 1,
    borderColor: `${T.blue}40`,
  },
  typeText: { fontSize: 10.5, fontWeight: '900', color: T.blue, letterSpacing: 0.4 },
  duePill: { height: 24, paddingHorizontal: 9, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: T.alt },
  dueText: { fontSize: 11, fontWeight: '800', color: T.muted },
  remark: { fontSize: 12, fontWeight: '600', color: T.ink, lineHeight: 17 },
  remarkLabel: { color: T.muted, fontWeight: '700' },
});
