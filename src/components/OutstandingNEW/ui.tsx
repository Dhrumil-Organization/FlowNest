// FILE: src/components/OutstandingNEW/ui.tsx
// Presentation pieces shared by the Receivables / Receivables Sudamo / Payable
// screens. No API calls and no business rules here — numbers and columns come
// from model.ts.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { S, T } from '@/src/theme';
import { Col, Row, SlabLook, cellText, compactInr, isZeroAmount, totalText, whole } from './model';

/** Max content width (same as the other ported finance screens). */
export const CONTENT_W = 1280;

/** One set of breakpoints for the whole module. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isPhone = width < 768;
  const isDesktop = width >= 1180;
  const gutter = isPhone ? 12 : 16;
  // dashboard cards per row
  const cardCols = width < 330 ? 1 : isPhone ? 2 : isDesktop ? 4 : 3;
  return { width, height, isPhone, isDesktop, gutter, cardCols };
}

const TONE: Record<SlabLook['tone'], string> = {
  nav: T.nav,
  blue: T.blue,
  red: T.red,
  green: T.green,
  amber: T.amber,
  purple: T.purple,
  copper: T.copper,
  yd: T.yd,
  pd: T.pd,
};
export const toneColor = (tone: SlabLook['tone']) => TONE[tone] || T.copper;

/* ------------------------------------------------------------------ */
/* Dashboard cards                                                     */
/* ------------------------------------------------------------------ */

type SlabCardProps = {
  card: Row;
  look: SlabLook;
  active: boolean;
  loading: boolean;
  onPress: (card: Row) => void;
};

/** The "All" card: full-width total at the top of the dashboard. */
export const HeroCard = memo(function HeroCard({ card, look, active, loading, onPress, label }: SlabCardProps & { label: string }) {
  const zero = isZeroAmount(card.summary);
  const compact = compactInr(card.summary);
  const { width } = useWindowDimensions();
  const narrow = width < 430; // phones: arrow only, so the label is not cut
  return (
    <TouchableOpacity
      style={[x.hero, active && x.heroActive]}
      activeOpacity={zero ? 1 : 0.9}
      disabled={zero}
      onPress={() => onPress(card)}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${whole(card.summary)} rupees`}
    >
      <View style={x.heroTop}>
        <View style={x.heroIcon}>
          {active && loading ? <ActivityIndicator size="small" color="#fff" /> : <Icon name={look.icon as any} size={20} color="#fff" />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={x.heroLabel} numberOfLines={1}>{label}</Text>
          <Text style={x.heroHint} numberOfLines={1}>{look.hint}</Text>
        </View>
        {!zero ? (
          <View style={[x.heroCta, narrow && x.heroCtaNarrow]}>
            {narrow ? null : <Text style={x.heroCtaText}>View parties</Text>}
            <Icon name="arrow-forward" size={narrow ? 16 : 14} color="#fff" />
          </View>
        ) : null}
      </View>
      <Text style={x.heroAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        ₹ {whole(card.summary)}
      </Text>
      {compact ? <Text style={x.heroCompact}>≈ ₹ {compact}</Text> : null}
    </TouchableOpacity>
  );
});

/** One slab card (Advance, Over Due, 0-30 …). */
export const SlabCard = memo(function SlabCard({ card, look, active, loading, onPress }: SlabCardProps) {
  const zero = isZeroAmount(card.summary);
  const c = toneColor(look.tone);
  const compact = compactInr(card.summary);
  return (
    <TouchableOpacity
      style={[x.slab, active && { borderColor: c, backgroundColor: `${c}0D` }, zero && x.slabZero]}
      activeOpacity={zero ? 1 : 0.85}
      disabled={zero}
      onPress={() => onPress(card)}
      accessibilityRole="button"
      accessibilityState={{ disabled: zero, selected: active }}
      accessibilityLabel={`${card.caption} ${whole(card.summary)} rupees`}
    >
      <View style={x.slabTop}>
        <View style={[x.slabIcon, { backgroundColor: `${c}16` }]}>
          {active && loading ? <ActivityIndicator size="small" color={c} /> : <Icon name={look.icon as any} size={17} color={c} />}
        </View>
        <Text style={x.slabCaption} numberOfLines={1}>{String(card.caption ?? '').toUpperCase()}</Text>
      </View>
      <Text style={[x.slabAmount, zero && { color: T.muted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
        ₹ {whole(card.summary)}
      </Text>
      <Text style={x.slabCompact} numberOfLines={1}>{compact ? `≈ ₹ ${compact}` : look.hint || ' '}</Text>
      <View style={x.slabFoot}>
        <Text style={[x.slabCta, { color: zero ? T.muted : c }]} numberOfLines={1}>
          {active && loading ? 'Loading…' : zero ? 'No amount' : 'View parties'}
        </Text>
        {!zero ? <Icon name="chevron-right" size={16} color={c} /> : null}
      </View>
    </TouchableOpacity>
  );
});

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

export type ViewMode = 'cards' | 'table';

/** Cards / Table switch of the summary and details panels. */
export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const item = (mode: ViewMode, icon: string, label: string) => {
    const on = value === mode;
    return (
      <TouchableOpacity
        key={mode}
        style={[x.toggleItem, on && x.toggleOn]}
        onPress={() => onChange(mode)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${label} view`}
      >
        <Icon name={icon as any} size={17} color={on ? '#fff' : T.nav} />
      </TouchableOpacity>
    );
  };
  return <View style={x.toggle}>{item('cards', 'view-agenda', 'Cards')}{item('table', 'view-list', 'Table')}</View>;
}

/** Label + value used inside the phone cards. */
export function Cell({ label, value, color, style }: { label: string; value: string; color?: string; style?: any }) {
  return (
    <View style={[x.cell, style]}>
      <Text style={x.cellLabel} numberOfLines={1}>{label}</Text>
      <Text style={[x.cellValue, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Text>
    </View>
  );
}

/** Totals of the summed columns as a horizontal strip (shown above the phone cards). */
export function TotalsStrip({
  columns,
  totals,
  count,
  countLabel,
}: {
  columns: Col[];
  totals: Record<string, number>;
  count: number;
  countLabel: string;
}) {
  const sums = columns.filter((c) => c.sum);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={x.totals}>
      <View style={[x.totalBox, x.totalBoxNav]}>
        <Text style={[x.totalLabel, { color: '#ffffffB3' }]}>{countLabel}</Text>
        <Text style={[x.totalValue, { color: '#fff' }]}>{count}</Text>
      </View>
      {sums.map((c) => (
        <View key={c.key} style={x.totalBox}>
          <Text style={x.totalLabel} numberOfLines={1}>{c.label}</Text>
          <Text style={x.totalValue} numberOfLines={1}>{totalText(c, totals)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/* Table (tablet / desktop, and "Table" view on phones)                */
/* ------------------------------------------------------------------ */

type TableProps = {
  columns: Col[];
  rows: Row[];
  totals: Record<string, number>;
  keyOf: (row: Row, index: number) => string;
  /** Row tap / action button (omit for read-only tables). */
  onOpen?: (row: Row) => void;
  empty?: React.ReactNode;
};

const TableRow = memo(function TableRow({
  row,
  index,
  columns,
  widths,
  onOpen,
}: {
  row: Row;
  index: number;
  columns: Col[];
  widths: number[];
  onOpen?: (row: Row) => void;
}) {
  const body = (
    <View style={[x.tr, index % 2 === 1 && x.trAlt]}>
      {columns.map((c, i) =>
        c.action ? (
          <View key={c.key} style={[x.tdAction, { width: widths[i] }]}>
            <View style={x.openBtn}>
              <Icon name="receipt-long" size={16} color={T.copper} />
            </View>
          </View>
        ) : (
          <Text
            key={c.key}
            style={[
              x.td,
              { width: widths[i], textAlign: c.align },
              i === 0 && x.tdName,
              c.fmt !== 'text' && x.tdNum,
            ]}
            numberOfLines={2}
          >
            {cellText(c, row)}
          </Text>
        ),
      )}
    </View>
  );
  if (!onOpen) return body;
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={() => onOpen(row)} accessibilityRole="button" accessibilityLabel={`Open details of ${row?.AccName ?? 'row'}`}>
      {body}
    </TouchableOpacity>
  );
});

/** Sticky header + virtualised rows + Totals row. Stretches to the full width
 *  when there is room and scrolls sideways when there is not. */
export function DataTable({ columns, rows, totals, keyOf, onOpen, empty }: TableProps) {
  const [boxW, setBoxW] = useState(0);
  const base = useMemo(() => columns.reduce((sum, c) => sum + c.width, 0), [columns]);
  const scale = boxW > base ? boxW / base : 1;
  const widths = useMemo(() => columns.map((c) => c.width * scale), [columns, scale]);
  const tableW = Math.max(boxW, base);

  const renderItem = useCallback(
    ({ item, index }: { item: Row; index: number }) => (
      <TableRow row={item} index={index} columns={columns} widths={widths} onOpen={onOpen} />
    ),
    [columns, widths, onOpen],
  );

  return (
    <View style={x.table} onLayout={(e: any) => setBoxW(Math.floor(e.nativeEvent.layout.width))}>
      {boxW > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={base > boxW} scrollEnabled={base > boxW} bounces={false}>
          <View style={{ width: tableW }}>
            <View style={x.thead}>
              {columns.map((c, i) => (
                <Text key={c.key} style={[x.th, { width: widths[i], textAlign: c.align }]} numberOfLines={1}>
                  {c.label}
                </Text>
              ))}
            </View>
            <FlatList
              style={{ flex: 1 }}
              data={rows}
              renderItem={renderItem}
              keyExtractor={keyOf}
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={10}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={empty ? <View style={{ width: boxW }}>{empty}</View> : null}
            />
            <View style={x.tfoot}>
              {columns.map((c, i) => (
                <Text
                  key={c.key}
                  style={[x.tf, { width: widths[i], textAlign: i === 0 ? 'left' : c.align }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {i === 0 ? `Totals (${rows.length})` : c.action ? '' : totalText(c, totals)}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

export const x = StyleSheet.create({
  // hero
  hero: {
    backgroundColor: T.nav,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: T.nav,
    ...S.card,
  },
  heroActive: { borderColor: T.copper },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  heroLabel: { color: '#fff', fontSize: 11.5, fontWeight: '800', letterSpacing: 1 },
  heroHint: { color: 'rgba(255,255,255,0.7)', fontSize: 11.5, fontWeight: '600', marginTop: 1 },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.copper,
  },
  heroCtaNarrow: { width: 34, height: 34, borderRadius: 17, paddingHorizontal: 0, justifyContent: 'center' },
  heroCtaText: { color: '#fff', fontSize: 11.5, fontWeight: '800' },
  heroAmount: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 14, letterSpacing: 0.2 },
  heroCompact: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, fontWeight: '700', marginTop: 2 },

  // slab card
  slab: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.border,
    padding: 12,
    minHeight: 122,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  slabZero: { backgroundColor: T.sub, shadowOpacity: 0, elevation: 0 },
  slabTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slabIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  slabCaption: { flex: 1, minWidth: 0, fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
  slabAmount: { fontSize: 18.5, fontWeight: '900', color: T.ink, marginTop: 10 },
  slabCompact: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 2 },
  slabFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: T.hair,
  },
  slabCta: { fontSize: 11.5, fontWeight: '800' },

  // toggle
  toggle: { flexDirection: 'row', backgroundColor: T.alt, borderRadius: 10, padding: 3, gap: 3 },
  toggleItem: { width: 38, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: T.nav },

  // cell
  cell: { minWidth: 0 },
  cellLabel: { fontSize: 9.5, fontWeight: '700', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
  cellValue: { fontSize: 13, fontWeight: '800', color: T.ink, marginTop: 2 },

  // totals strip
  totals: { gap: 8, paddingVertical: 2 },
  totalBox: {
    minWidth: 112,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  totalBoxNav: { backgroundColor: T.nav, borderColor: T.nav, minWidth: 84 },
  totalLabel: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  totalValue: { fontSize: 14, fontWeight: '900', color: T.ink, marginTop: 3 },

  // table
  table: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  thead: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.border },
  th: { paddingHorizontal: 12, paddingVertical: 11, fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 46, borderBottomWidth: 1, borderBottomColor: T.hair, backgroundColor: T.surface },
  trAlt: { backgroundColor: T.sub },
  td: { paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: T.ink, fontWeight: '500' },
  tdName: { fontWeight: '700' },
  tdNum: { fontWeight: '700' },
  tdAction: { alignItems: 'center', justifyContent: 'center' },
  openBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${T.copper}14`,
    borderWidth: 1,
    borderColor: `${T.copper}40`,
  },
  tfoot: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.alt, borderTopWidth: 1, borderTopColor: T.border },
  tf: { paddingHorizontal: 12, paddingVertical: 12, fontSize: 13, fontWeight: '900', color: T.nav },
});
