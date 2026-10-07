// FILE: src/components/OutstandingNEW/OutstandingView.tsx
// ERP port of the three legacy "outstanding dashboard" screens. One engine, three
// screens (see ./Receivables.tsx, ./ReceivablesSudamo.tsx, ./Payable.tsx):
//
//   Receivables          Rayons login          legacy components/Receivables         route app/(tabs)/receivables.tsx
//   Receivables Sudamo   Sudamo / Knits login  legacy components/ReceivablesSudamo   route app/(tabs)/receivables-sudamo.tsx
//   Payable              both                  legacy components/Payable             route app/(tabs)/payable.tsx
//
// Which Receivables screen opens is decided by the logged-in property, the same
// rule as the Legacy Home (`prp === 'sudamo_knits' ? 'receivables-sudamo' : 'receivables'`)
// — see src/screens/production/ReceivablesScreen.tsx.
//
// Endpoints: ./api.ts (paths, headers, keys and response paths unchanged).
// Rules    : ./model.ts (payloads, number formats, columns, totals, cumulative).
//
// Flow kept exactly as legacy
//   1. open        -> GET dashprpgrp: "Last synced" + property groups; first group selected.
//                     Internal / External / Both: Receivables start on External, Payable on Internal.
//   2. group       -> GET dashprp (properties), GET get_criterion (parties), GET get_criterion (sales
//                     executives, Receivables only). Property change -> POST get_dashoutshead (sub heads).
//   3. Filters > Load -> POST dashdata (fetch 'summary', current month to date). The dashboard is
//                     accepted only when cards + details + summary all have rows, otherwise it is emptied.
//                     Nothing is loaded before Load is pressed.
//   4. card tap    -> POST dashdata (fetch 'slabdetail', the tapped card in `selecetedslab`) and the
//                     party summary of that card opens. A card with amount 0 cannot be opened.
//   5. account tap -> bill details of that account (rows with the same ACCCODE).
//   6. search      -> cards by caption (no match = all cards stay), summary and details on every value.
//   7. Rayons Receivables + role "Receivables View Combine": no property-group picker, prptype 'R'.
//
// Deliberate differences from legacy
//   - Look: ERP theme / font, card grid, in-screen panels with a back row (Android back closes them),
//     Filters in the kit sheet, phones get account / bill cards with a Table switch.
//   - Table labels cleaned: "91-Above" / "Slab5" -> "91-120" / "121 Above" (the card captions),
//     "Crday" / "Sename" / "Crlimit" / "Brk Name" / "Acc Code" -> Credit Days / Sales Executive /
//     Credit Limit / Broker / Code. Receivables slab and credit-limit cells showed the raw ".00"
//     text; they are formatted like the other amounts.
//   - Receivables "Advance" table: legacy printed 0 in the Sales Executive / Code / Broker columns
//     (text sent through the number formatter); the real text is shown.
//   - Card tap that returns no rows: legacy emptied the whole dashboard; the cards stay and a
//     message is shown.
//   - Load that returns no rows: legacy left the filter drawer open over the emptied dashboard;
//     the sheet closes and "No data found" is shown.
//   - Load without a property group: legacy left the loader spinning; a message is shown.
//     With the role "Receivables View Combine" the group is not required (prptype is 'R').
//   - Changing the property group clears the Property / Party / Sub Head / Sales Executive
//     picks of the old group (legacy kept sending them).
//   - Role source: 'mobile_raw_login_response'.role1 first, legacy 'user_login_role' as fallback
//     (the ERP login does not write 'user_login_role').
//   - Not ported (legacy dead code, nothing on screen used it): the salesexe / getdesign / itm
//     calls with prpcode 'SIP', the commented-out Account picker (/api/get_dashparty) and date
//     range picker, Payable's unused sales-executive call, data.tsx sample data, ProdOrderTrackingCard,
//     PartyHistoryModal.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppAlert } from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import { Btn, BusyOverlay, Chip, EmptyState, SearchBox } from '@/src/components/erpUi';
import {
  errorText,
  fetchParties,
  fetchProperties,
  fetchSalesExecutives,
  fetchSubHeads,
  fetchSync,
  postDashData,
} from './api';
import DetailPanel from './DetailPanel';
import FilterSheet from './FilterSheet';
import {
  INTERNAL_OPTIONS,
  InternalOption,
  Row,
  Selection,
  VARIANTS,
  VariantKey,
  buildSlabPayload,
  buildSummaryPayload,
  hasDashRows,
  prpTypeOf,
  readCombineRole,
  selectionChips,
  selectionCount,
  slabLook,
  visibleCards,
} from './model';
import SummaryPanel from './SummaryPanel';
import { CONTENT_W, HeroCard, SlabCard, ViewMode, useLayout } from './ui';

type Props = {
  variant: VariantKey;
  token: string;
  /** API host of the logged-in property (ErpSessionGate). */
  API: string;
  username?: string;
};

export default function OutstandingView({ variant, token, API }: Props) {
  const v = VARIANTS[variant];
  const L = useLayout();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /* ---------------- role (Rayons Receivables only) ---------------- */
  const [combine, setCombine] = useState(false);
  const [roleReady, setRoleReady] = useState(!v.combineRole);
  useEffect(() => {
    if (!v.combineRole) return;
    let on = true;
    void readCombineRole().then((yes) => {
      if (!on) return;
      setCombine(yes);
      setRoleReady(true);
    });
    return () => {
      on = false;
    };
  }, [v.combineRole]);

  /* ---------------- sync + property groups ---------------- */
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSync, setLastSync] = useState('');
  const [groups, setGroups] = useState<Row[]>([]);

  const loadSync = useCallback(async () => {
    if (!token) return;
    setSyncLoading(true);
    try {
      const info = await fetchSync(API, token, v);
      if (!alive.current || !info) return;
      setLastSync(info.lastSync);
      setGroups(info.groups);
    } catch (e) {
      console.log(`[${v.key}] dashprpgrp error:`, errorText(e));
    } finally {
      if (alive.current) setSyncLoading(false);
    }
  }, [API, token, v]);

  useEffect(() => {
    void loadSync();
  }, [loadSync]);

  /* ---------------- filters ---------------- */
  const [group, setGroup] = useState<Row | null>(null);
  const [internal, setInternal] = useState<InternalOption>(
    () => INTERNAL_OPTIONS.find((o) => o.value === v.internalDefault) || INTERNAL_OPTIONS[0],
  );
  const [selProperties, setSelProperties] = useState<Row[]>([]);
  const [selParty, setSelParty] = useState<Row | null>(null);
  const [selSubHeads, setSelSubHeads] = useState<Row[]>([]);
  const [selSalesExes, setSelSalesExes] = useState<Row[]>([]);

  const [properties, setProperties] = useState<Row[]>([]);
  const [parties, setParties] = useState<Row[]>([]);
  const [subHeads, setSubHeads] = useState<Row[]>([]);
  const [salesExes, setSalesExes] = useState<Row[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [subHeadsLoading, setSubHeadsLoading] = useState(false);
  const [salesExesLoading, setSalesExesLoading] = useState(false);

  // legacy: the first property group is selected as soon as the list arrives
  useEffect(() => {
    if (groups.length > 0 && !group) setGroup(groups[0]);
  }, [groups, group]);

  const pickGroup = (next: Row | null) => {
    if (next?.PrpTypeCode !== group?.PrpTypeCode) {
      setSelProperties([]);
      setSelParty(null);
      setSelSubHeads([]);
      setSelSalesExes([]);
    }
    setGroup(next);
  };

  const prptype = prpTypeOf(v, { group, combine });
  const groupReady = roleReady && (Boolean(group) || (v.combineRole && combine));

  // properties + parties + sales executives of the property group
  const listSeq = useRef(0);
  useEffect(() => {
    if (!token || !groupReady) return;
    const seq = ++listSeq.current;
    const fresh = () => alive.current && seq === listSeq.current;

    setPropertiesLoading(true);
    fetchProperties(API, token, v, prptype)
      .then((rows) => { if (fresh() && rows) setProperties(rows); })
      .catch((e) => console.log(`[${v.key}] dashprp error:`, errorText(e)))
      .finally(() => { if (fresh()) setPropertiesLoading(false); });

    setPartiesLoading(true);
    fetchParties(API, token, v, prptype)
      .then((rows) => { if (fresh() && rows) setParties(rows); })
      .catch((e) => console.log(`[${v.key}] get_criterion (party) error:`, errorText(e)))
      .finally(() => { if (fresh()) setPartiesLoading(false); });

    if (v.salesExecutiveFilter) {
      setSalesExesLoading(true);
      fetchSalesExecutives(API, token, v, prptype)
        .then((rows) => { if (fresh() && rows) setSalesExes(rows); })
        .catch((e) => console.log(`[${v.key}] get_criterion (salesexe) error:`, errorText(e)))
        .finally(() => { if (fresh()) setSalesExesLoading(false); });
    }
  }, [API, token, v, groupReady, prptype]);

  // sub heads of the selected properties
  const subSeq = useRef(0);
  useEffect(() => {
    if (!token || !groupReady) return;
    const seq = ++subSeq.current;
    const fresh = () => alive.current && seq === subSeq.current;
    setSubHeadsLoading(true);
    fetchSubHeads(API, token, v, prptype, selProperties.map((item) => item.PrpCode))
      .then((rows) => { if (fresh() && rows) setSubHeads(rows); })
      .catch((e) => console.log(`[${v.key}] get_dashoutshead error:`, errorText(e)))
      .finally(() => { if (fresh()) setSubHeadsLoading(false); });
  }, [API, token, v, groupReady, prptype, selProperties]);

  const selection: Selection = useMemo(
    () => ({ group, internal, properties: selProperties, party: selParty, subHeads: selSubHeads, salesExes: selSalesExes, combine }),
    [group, internal, selProperties, selParty, selSubHeads, selSalesExes, combine],
  );

  /* ---------------- dashboard ---------------- */
  const [cards, setCards] = useState<Row[]>([]);
  const [details, setDetails] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [activeCard, setActiveCard] = useState<Row | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [detailAccount, setDetailAccount] = useState<Row | null>(null);

  const [cardSearch, setCardSearch] = useState('');
  const [summarySearch, setSummarySearch] = useState('');
  const [detailSearch, setDetailSearch] = useState('');
  const [summaryMode, setSummaryMode] = useState<ViewMode | null>(null);
  const [detailMode, setDetailMode] = useState<ViewMode | null>(null);

  const canRequest = () => {
    if (!token) {
      void AppAlert.alert('Error', 'User not authenticated. Please log in again.');
      return false;
    }
    if (!group && !(v.combineRole && combine)) {
      void AppAlert.alert(v.title, 'Please select a Sales Property Group in Filters first.');
      return false;
    }
    return true;
  };

  /** Filters > Load */
  const load = async () => {
    if (loading || !canRequest()) return;
    setLoading(true);
    try {
      const d = await postDashData(API, token, buildSummaryPayload(v, selection));
      if (!alive.current) return;
      if (d.success) {
        setLoadedOnce(true);
        setFiltersOpen(false);
        if (hasDashRows(d)) {
          setCards(d.cards);
          setDetails(d.details);
          setSummary(d.summary);
        } else {
          setCards([]);
          setDetails([]);
          setSummary([]);
        }
      } else {
        void AppAlert.alert(v.title, 'The server did not return the dashboard. Please try again.');
      }
    } catch (e) {
      if (alive.current) void AppAlert.alert('Error', errorText(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  };

  /** Card tap */
  const openCard = async (card: Row) => {
    if (loading) return;
    setActiveCard(card);
    if (!canRequest()) return;
    setLoading(true);
    try {
      const d = await postDashData(API, token, buildSlabPayload(v, selection, card));
      if (!alive.current) return;
      if (d.success && hasDashRows(d)) {
        setCards(d.cards);
        setDetails(d.details);
        setSummary(d.summary);
        setSummaryOpen(true);
      } else if (d.success) {
        void AppAlert.alert(String(card.caption ?? v.title), 'No data found for this card.');
      } else {
        void AppAlert.alert(v.title, 'The server did not return the summary. Please try again.');
      }
    } catch (e) {
      if (alive.current) void AppAlert.alert('Error', errorText(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  };
  const openCardRef = useRef(openCard);
  openCardRef.current = openCard;
  const onCardPress = useCallback((card: Row) => void openCardRef.current(card), []);

  // Android hardware back: details -> summary -> dashboard
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detailAccount) {
        setDetailAccount(null);
        return true;
      }
      if (summaryOpen) {
        setSummaryOpen(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [detailAccount, summaryOpen]);

  /* ---------------- dashboard grid ---------------- */
  const shown = useMemo(() => visibleCards(cards, cardSearch), [cards, cardSearch]);
  const hero = shown.length > 0 && String(shown[0].slab).toLowerCase() === 'all' ? shown[0] : null;
  const grid = hero ? shown.slice(1) : shown;
  const chips = useMemo(() => selectionChips(v, selection), [v, selection]);
  const filterCount = selectionCount(selection);
  const totalLabel = v.tables === 'payable' ? 'TOTAL PAYABLE' : 'TOTAL RECEIVABLE';
  const isActive = (card: Row) => activeCard?.slab === card.slab;

  const header = (
    <View style={{ paddingHorizontal: 5, paddingBottom: 5, gap: 10 }}>
      {hero ? (
        <HeroCard
          card={hero}
          look={slabLook(v, hero)}
          label={totalLabel}
          active={isActive(hero)}
          loading={loading}
          onPress={onCardPress}
        />
      ) : null}
      {grid.length ? (
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Ageing & status</Text>
          <Text style={s.sectionMeta}>Tap a card to see its parties</Text>
        </View>
      ) : null}
    </View>
  );

  const emptyState = loading ? (
    <View style={s.loadingBox}>
      <ActivityIndicator size="large" color={T.copper} />
      <Text style={s.loadingText}>Loading {v.noun}…</Text>
    </View>
  ) : !loadedOnce ? (
    <EmptyState
      icon={v.tables === 'payable' ? 'payments' : 'account-balance-wallet'}
      title={`Load ${v.noun}`}
      text="Choose the filters and press Load to see the outstanding position."
      action={
        <View style={s.emptyActions}>
          <Btn label="Filters" icon="tune" kind="ghost" onPress={() => setFiltersOpen(true)} />
          <Btn label="Load" icon="refresh" kind="copper" onPress={() => void load()} loading={syncLoading && groups.length === 0} />
        </View>
      }
    />
  ) : (
    <EmptyState
      icon="inbox"
      title="No data found"
      text="Nothing matches these filters."
      action={<Btn label="Change filters" icon="tune" kind="ghost" onPress={() => setFiltersOpen(true)} />}
    />
  );

  return (
    <View style={s.root}>
      {/* TOOLBAR */}
      <View style={s.toolbar}>
        <View style={[s.inner, { paddingHorizontal: L.gutter }]}>
          <View style={s.toolRow}>
            <SearchBox value={cardSearch} onChangeText={setCardSearch} placeholder={v.searchPlaceholder} style={{ flex: 1, minWidth: 0 }} />
            <Btn
              label={L.isPhone ? '' : 'Filters'}
              icon="tune"
              onPress={() => setFiltersOpen(true)}
              compact
              badge={filterCount || undefined}
              style={{ height: 42, minWidth: 46 }}
            />
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.inner}
          contentContainerStyle={[s.chipRow, { paddingHorizontal: L.gutter }]}
        >
          <TouchableOpacity
            style={s.sync}
            onPress={() => void loadSync()}
            disabled={syncLoading}
            accessibilityRole="button"
            accessibilityLabel="Refresh last sync time"
          >
            {syncLoading ? <ActivityIndicator size="small" color={T.green} /> : <Icon name="sync" size={14} color={T.green} />}
            <Text style={s.syncText} numberOfLines={1}>
              {syncLoading ? 'Last Syncing...' : `Last Synced: ${lastSync || '—'}`}
            </Text>
          </TouchableOpacity>
          {chips.map((c, i) => (
            <Chip key={`${c.icon}-${i}`} label={c.text} icon={c.icon} onPress={() => setFiltersOpen(true)} />
          ))}
        </ScrollView>
      </View>

      {/* DASHBOARD */}
      <FlatList
        key={`grid-${L.cardCols}`}
        data={grid}
        numColumns={L.cardCols}
        keyExtractor={(item, index) => `${item.slab}-${index}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.inner, { paddingHorizontal: L.gutter - 5, paddingTop: 12, paddingBottom: 28 }, shown.length === 0 && s.grow]}
        ListHeaderComponent={shown.length ? header : null}
        ListEmptyComponent={shown.length === 0 ? emptyState : null}
        renderItem={({ item }) => (
          <View style={{ width: `${100 / L.cardCols}%` as any, padding: 5 }}>
            <SlabCard card={item} look={slabLook(v, item)} active={isActive(item)} loading={loading} onPress={onCardPress} />
          </View>
        )}
      />

      {/* SUMMARY OF THE TAPPED CARD */}
      {summaryOpen ? (
        <SummaryPanel
          variant={v}
          card={activeCard}
          rows={summary}
          search={summarySearch}
          onSearch={setSummarySearch}
          mode={summaryMode}
          onMode={setSummaryMode}
          onBack={() => setSummaryOpen(false)}
          onOpen={setDetailAccount}
        />
      ) : null}

      {/* BILL DETAILS OF ONE ACCOUNT */}
      {summaryOpen && detailAccount ? (
        <DetailPanel
          variant={v}
          card={activeCard}
          account={detailAccount}
          details={details}
          search={detailSearch}
          onSearch={setDetailSearch}
          mode={detailMode}
          onMode={setDetailMode}
          onBack={() => setDetailAccount(null)}
        />
      ) : null}

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        variant={v}
        combine={v.combineRole && combine}
        internal={internal}
        onInternal={setInternal}
        groups={groups}
        groupsLoading={syncLoading}
        group={group}
        onGroup={pickGroup}
        properties={properties}
        propertiesLoading={propertiesLoading}
        selProperties={selProperties}
        onProperties={setSelProperties}
        parties={parties}
        partiesLoading={partiesLoading}
        selParty={selParty}
        onParty={setSelParty}
        subHeads={subHeads}
        subHeadsLoading={subHeadsLoading}
        selSubHeads={selSubHeads}
        onSubHeads={setSelSubHeads}
        salesExes={salesExes}
        salesExesLoading={salesExesLoading}
        selSalesExes={selSalesExes}
        onSalesExes={setSelSalesExes}
        loading={loading}
        onLoad={() => void load()}
      />

      <BusyOverlay visible={loading && !filtersOpen && cards.length > 0} text="Loading…" />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  inner: { width: '100%', maxWidth: CONTENT_W, alignSelf: 'center' },
  grow: { flexGrow: 1, justifyContent: 'center' },
  toolbar: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border, paddingTop: 10, paddingBottom: 9, gap: 8 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipRow: { gap: 6, alignItems: 'center' },
  sync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: `${T.green}12`,
    borderWidth: 1,
    borderColor: `${T.green}40`,
  },
  syncText: { fontSize: 11.5, fontWeight: '700', color: T.green },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: T.nav, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionMeta: { fontSize: 11.5, fontWeight: '600', color: T.muted, flexShrink: 1 },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 13, fontWeight: '800', color: T.nav },
  emptyActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
});
