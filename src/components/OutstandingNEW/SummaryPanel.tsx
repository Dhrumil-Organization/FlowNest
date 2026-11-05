// FILE: src/components/OutstandingNEW/SummaryPanel.tsx
// Party summary of one dashboard card (legacy: the "Receivables > <card> summary"
// overlay with SummaryTable / SummaryAdvanceTable / OnAccountSummaryTable).
// Same rows, same columns in the same order, same totals; search works on every
// value of a row with the legacy 250 ms delay.
//   wide screens : table (stretches to the full width, scrolls sideways if needed)
//   phones       : one card per account (Table view is one tap away)
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { S, T } from '@/src/theme';
import { Avatar, EmptyState, PanelHeader, SearchBox } from '@/src/components/erpUi';
import { Col, Row, Variant, cellText, columnTotals, filterRows, summaryColumns, summaryKindOf, toNum } from './model';
import { CONTENT_W, Cell, DataTable, TotalsStrip, ViewMode, ViewToggle, useLayout } from './ui';

type Props = {
  variant: Variant;
  card: Row | null;
  rows: Row[];
  search: string;
  onSearch: (t: string) => void;
  mode: ViewMode | null;
  onMode: (m: ViewMode) => void;
  onBack: () => void;
  onOpen: (row: Row) => void;
};

const AccountCard = memo(function AccountCard({
  row,
  columns,
  onOpen,
}: {
  row: Row;
  columns: Col[];
  onOpen: (row: Row) => void;
}) {
  const amounts = columns.filter((c) => c.sum);
  const primary = amounts[0];
  const rest = amounts.slice(1);
  const texts = columns.filter((c) => !c.sum && !c.action && c.key !== 'AccName');
  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.85}
      onPress={() => onOpen(row)}
      accessibilityRole="button"
      accessibilityLabel={`Open details of ${row.AccName}`}
    >
      <View style={s.cardHead}>
        <Avatar name={row.AccName} size={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.cardName} numberOfLines={2}>{String(row.AccName ?? '—')}</Text>
          {primary ? (
            <Text style={s.cardPrimary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              <Text style={s.cardPrimaryLabel}>{primary.label}  </Text>₹ {cellText(primary, row)}
            </Text>
          ) : null}
        </View>
        <View style={s.cardOpen}>
          <Icon name="receipt-long" size={16} color={T.copper} />
        </View>
      </View>

      {rest.length ? (
        <View style={s.cardGrid}>
          {rest.map((c) => (
            <Cell
              key={c.key}
              label={c.label}
              value={cellText(c, row)}
              color={toNum(row[c.key]) === 0 ? T.muted : undefined}
              style={s.cardCell}
            />
          ))}
        </View>
      ) : null}

      {texts.length ? (
        <View style={s.cardMeta}>
          {texts.map((c) => (
            <Text key={c.key} style={s.metaText} numberOfLines={1}>
              <Text style={s.metaLabel}>{c.label}: </Text>
              {cellText(c, row)}
            </Text>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

export default function SummaryPanel({ variant, card, rows, search, onSearch, mode, onMode, onBack, onOpen }: Props) {
  const L = useLayout();
  const caption = card?.caption;
  const columns = useMemo(() => summaryColumns(variant, summaryKindOf(caption)), [variant, caption]);

  // legacy: the summary search is applied 250 ms after typing stops
  const [query, setQuery] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const data = useMemo(() => filterRows(rows, query), [rows, query]);
  const totals = useMemo(() => columnTotals(columns, data), [columns, data]);

  const view: ViewMode = mode || (L.isPhone ? 'cards' : 'table');
  const cols = L.isPhone ? 1 : L.isDesktop ? 3 : 2;
  const keyOf = useCallback((item: Row, index: number) => `${item.AccCode}-${index}`, []);

  const empty = (
    <EmptyState icon="search-off" title="No account found" text={query ? 'Nothing matches this search.' : 'There is no account in this card.'} />
  );

  return (
    <View style={s.root}>
      <PanelHeader
        onBack={onBack}
        crumbs={[variant.title]}
        title={`${caption ?? ''} summary`}
        subtitle={`${data.length} account${data.length === 1 ? '' : 's'}`}
        right={<ViewToggle value={view} onChange={onMode} />}
      />
      <View style={s.searchBar}>
        <View style={[s.inner, { paddingHorizontal: L.gutter }]}>
          <SearchBox value={search} onChangeText={onSearch} placeholder="Search summary..." />
        </View>
      </View>

      {view === 'table' ? (
        <View style={[s.inner, s.fill, { padding: L.gutter }]}>
          <DataTable columns={columns} rows={data} totals={totals} keyOf={keyOf} onOpen={onOpen} empty={empty} />
        </View>
      ) : (
        <FlatList
          key={`cards-${cols}`}
          data={data}
          numColumns={cols}
          keyExtractor={keyOf}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          windowSize={9}
          contentContainerStyle={[s.inner, { paddingHorizontal: L.gutter - 5, paddingTop: 10, paddingBottom: 24 }]}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 5, paddingBottom: 6 }}>
              <TotalsStrip columns={columns} totals={totals} count={data.length} countLabel="Accounts" />
            </View>
          }
          ListEmptyComponent={empty}
          renderItem={({ item }) => (
            <View style={{ width: `${100 / cols}%` as any, padding: 5 }}>
              <AccountCard row={item} columns={columns} onOpen={onOpen} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: T.bg, zIndex: 20, elevation: 20 },
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
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardName: { fontSize: 14, fontWeight: '800', color: T.ink, lineHeight: 18 },
  cardPrimary: { fontSize: 15.5, fontWeight: '900', color: T.nav, marginTop: 3 },
  cardPrimaryLabel: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  cardOpen: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${T.copper}14`,
    borderWidth: 1,
    borderColor: `${T.copper}40`,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 9,
    backgroundColor: T.sub,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.hair,
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  cardCell: { width: '33.33%', paddingHorizontal: 4 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 3 },
  metaText: { fontSize: 11.5, fontWeight: '700', color: T.ink, maxWidth: '100%' },
  metaLabel: { fontWeight: '600', color: T.muted },
});
