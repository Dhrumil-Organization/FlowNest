// FILE: src/components/PartyDashboardNEW/index.tsx
// NEW ERP port of the legacy Party Dashboard.
//
// Legacy sources (live files only):
//   components/PartyDashboard/index.tsx             — party list / search / filter   (route app/(tabs)/party-dashboard.tsx)
//   components/PartyDashboard/PartyDetailScreen.tsx — party detail, 4 tabs           (route app/(tabs)/PartyDetailScreen.tsx)
//   common/API/Functions.tsx fetchPropertyData      — property list for the filter
// NOT ported because nothing imports them (leftovers copied from other modules): FinalTable, FinalTableOut,
//   FinalTableRates, SummaryTable, PartyOverlay, LedgerOverlay, CustomDrawer, Modal, ProdOrderTrackingCard,
//   PartyHistoryModal/, customBase64, encodingUtils, urlSafeEncode and data.tsx (46k lines, never imported).
//
// Endpoints (all in ./api.ts):
//   GET  /api/getproperty      no params                          -> res.data.response.data
//   GET  /api/mobaccountbasic  { prpcode, prptype, yearno, strcode:'0', txntype:'mob_party_dashboard', partytype:'p',
//                                type:'s', page:1, limit:20, search:'', isceo:0, partype:0, grntype:'', fetch:'',
//                                acccode:'', billdate:'', strtype:'', isfaint:'', user_id:1 }
//                              -> res.data.response.data || res.data.data || res.data.result
//   POST /api/get_report       { prptype, prpcodes, parcodes:[acccode], yearno, mheads, sheads, contras, inverse,
//                                fromdate, todate, reportytype:0, showopening:1, display:1, showinternal:-1,
//                                txntype:'mob_party_dashboard', rptid:1635, rptaction:'get_collection_comman_rpt',
//                                export:'', grpby:'party' }
//                              -> res.data.response.data.{get_outstanding_data, get_ledger_data, get_customer_rate,
//                                 get_billings, account_summary}
// AsyncStorage keys: 'get_property' (read + written inside fetchPropertyData, as legacy).
//   `username` / `getUserId` (legacy route passed AsyncStorage 'user_details' / 'user_prptype') are accepted but,
//   exactly like legacy, not used by any request (legacy sends the constant user_id: 1).
//
// Behaviour kept exactly as legacy:
//   - years = 5 options from the current calendar year, first one selected; first property auto-selected.
//   - the party list is NOT loaded automatically: it loads only when OK is pressed in Filters (page 1, limit 20).
//   - the search box filters the loaded rows client-side on accname; the server `search` param stays ''.
//   - tapping a party opens the detail with the party + property + year chosen at that moment.
//   - legacy shows no alerts and has no validations in this module (errors are only console-logged).
//
// Deliberate deviations (presentation only):
//   - detail is an in-component step (local state) with a back row + Android hardware back, instead of router.push.
//   - Filters / property picker / year picker are one kit Sheet with three views instead of stacked full-screen overlays.
//   - detail chip: legacy read `.LngName` from the un-parsed JSON string param, so it always showed "Property";
//     the port shows the real property name (display fix).
//   - detail: the legacy "tune" icon only set an unused flag (no filter UI was rendered) and the detail's own
//     /api/getproperty call fed that never-rendered filter — both dropped.
//   - property picker: `LngName.toLowerCase()` guarded against a missing LngName (legacy would crash).
//   - on tablet/desktop the detail tabs render as tables with the same fields as the legacy cards.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler, FlatList, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { S, T } from '@/src/theme';
import { Btn, Chip, EmptyState, PickField, SearchBox, Sheet } from '../erpUi';
import { fetchPartyList, fetchPropertyData, Row } from './api';
import { buildYearOptions, filterParties, fmtLimit, fullAddressOf } from './model';
import PartyDetail from './PartyDetail';

type Props = { token: string; API: string; username?: string; getUserId?: string };
type DetailParams = { party: Row; selectedProperty: any; selectedYear: string };
type SheetView = 'filters' | 'property' | 'year';

const SkeletonCard = () => (
  <View style={s.card}>
    <View style={[s.avatar, { backgroundColor: T.alt }]} />
    <View style={{ flex: 1 }}>
      <View style={[s.skel, { width: '40%' }]} />
      <View style={[s.skel, { width: '80%', height: 14 }]} />
      <View style={[s.skel, { width: '60%', marginBottom: 0 }]} />
    </View>
  </View>
);

export default function PartyDashboardNEW({ token, API }: Props) {
  const { width } = useWindowDimensions();
  const cols = width < 768 ? 1 : width >= 1180 ? 3 : 2;
  const gutter = width < 768 ? 12 : 16;

  const [search, setSearch] = useState('');
  const [partyData, setPartyData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const [sheetView, setSheetView] = useState<SheetView | null>(null);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [propertyData, setPropertyData] = useState<Row[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [propertySearch, setPropertySearch] = useState('');

  const [detail, setDetail] = useState<DetailParams | null>(null);

  // YEAR
  useEffect(() => {
    const arr = buildYearOptions();
    setYearOptions(arr);
    setSelectedYear(arr[0]);
  }, []);

  // PROPERTY
  useEffect(() => {
    if (!token) return;
    let alive = true;
    const load = async () => {
      const data = await fetchPropertyData(API, token);
      if (!alive) return;
      setPropertyData(data || []);
      if (data?.length) setSelectedProperty(data[0]);
    };
    void load();
    return () => { alive = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Android hardware back: detail step -> list
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!detail) return false;
      setDetail(null);
      return true;
    });
    return () => sub.remove();
  }, [detail]);

  // API CALL (only from Filters > OK, like legacy)
  const fetchpartylist = async () => {
    if (!selectedProperty) return;
    setLoading(true);
    try {
      setPartyData(await fetchPartyList(API, token, selectedProperty, selectedYear));
    } catch (error: any) {
      console.log('[PartyDashboardNEW] mobaccountbasic error:', error?.response?.data || error?.message);
      setPartyData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => filterParties(partyData, search), [partyData, search]);
  const filteredProps = useMemo(
    () => propertyData.filter((p) => String(p.LngName ?? '').toLowerCase().includes(propertySearch.toLowerCase())),
    [propertyData, propertySearch],
  );

  const closeSheet = () => {
    // closing a picker returns to Filters (legacy pickers were stacked above the filter overlay)
    if (sheetView === 'property' || sheetView === 'year') setSheetView('filters');
    else setSheetView(null);
  };

  if (detail) {
    return (
      <PartyDetail
        key={`${detail.party?.acccode}-${detail.selectedYear}`}
        token={token}
        API={API}
        party={detail.party}
        selectedProperty={detail.selectedProperty}
        selectedYear={detail.selectedYear}
        onBack={() => setDetail(null)}
      />
    );
  }

  const renderItem = ({ item }: { item: Row }) => {
    const fullAddress = fullAddressOf(item);
    return (
      <View style={{ width: `${100 / cols}%` as any, padding: 6 }}>
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.85}
          accessibilityRole="button"
          onPress={() => setDetail({ party: item, selectedProperty, selectedYear })}
        >
          <View style={s.avatar}>
            <Text style={s.avatarText}>{item.accountname?.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.topRow}>
              <View style={s.codeBadge}><Text style={s.codeText} numberOfLines={1}>{item.acccode}</Text></View>
              <View style={s.statusBadge}><Text style={s.statusText}>Active</Text></View>
            </View>
            <Text style={s.name}>{item.accountname}</Text>
            <Text style={s.address}>{fullAddress || 'No address available'}</Text>
            <View style={{ marginTop: 8, gap: 3 }}>
              <View style={s.extraRow}>
                <Icon name="account-balance-wallet" size={13} color={T.copper} />
                <Text style={s.extraText} numberOfLines={1}>Limit: {fmtLimit(item.crlimit)}</Text>
              </View>
              <View style={s.extraRow}>
                <Icon name="person" size={13} color={T.copper} />
                <Text style={s.extraText} numberOfLines={1}>{item.conname || '-'}</Text>
              </View>
              <View style={s.extraRow}>
                <Icon name="call" size={13} color={T.copper} />
                <Text style={s.extraText} numberOfLines={1}>{item.contel || '-'}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* TOOLBAR: search + filters + selected property / year */}
      <View style={s.toolbar}>
        <View style={[s.inner, { paddingHorizontal: gutter }]}>
          <View style={s.toolRow}>
            <SearchBox value={search} onChangeText={setSearch} placeholder="Search parties..." style={{ flex: 1, minWidth: 0 }} />
            <Btn label={width < 768 ? '' : 'Filters'} icon="tune" kind="ghost" onPress={() => setSheetView('filters')} />
          </View>
          <View style={s.chipRow}>
            <Chip
              icon="business"
              label={String(selectedProperty?.LngName || selectedProperty?.PrpCode || 'Select Property')}
              onPress={() => setSheetView('filters')}
              style={{ maxWidth: width * 0.7 }}
            />
            <Chip icon="event" label={selectedYear || 'Year'} />
          </View>
        </View>
      </View>

      {/* LIST */}
      <FlatList
        key={'cols-' + cols}
        data={filteredData}
        numColumns={cols}
        keyExtractor={(_, index) => index.toString()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.listContent, { paddingHorizontal: gutter - 6 }]}
        renderItem={renderItem}
        ListEmptyComponent={
          loading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={{ width: `${100 / cols}%` as any, padding: 6 }}><SkeletonCard /></View>
              ))}
            </View>
          ) : (
            <EmptyState icon="groups" title="No data found" />
          )
        }
      />

      {/* FILTERS (+ property / year pickers as views of the same sheet) */}
      <Sheet
        open={sheetView !== null}
        onClose={closeSheet}
        title={sheetView === 'property' ? 'Select Property' : sheetView === 'year' ? 'Select Year' : 'Filters'}
        footer={
          sheetView === 'filters' ? (
            <Btn
              label="OK"
              onPress={() => {
                void fetchpartylist();
                setSheetView(null);
              }}
              style={{ flex: 1 }}
            />
          ) : (
            <Btn label="Back" icon="arrow-back" kind="ghost" onPress={() => setSheetView('filters')} style={{ flex: 1 }} />
          )
        }
      >
        {sheetView === 'filters' ? (
          <>
            <PickField
              label="Property"
              icon="business"
              value={selectedProperty?.LngName}
              placeholder="Select property"
              onPress={() => setSheetView('property')}
            />
            <PickField
              label="Year"
              icon="event"
              value={selectedYear}
              placeholder="Select Year"
              onPress={() => setSheetView('year')}
            />
          </>
        ) : null}

        {sheetView === 'year' ? (
          <View style={s.pickList}>
            {yearOptions.map((y, i) => (
              <TouchableOpacity
                key={i}
                style={s.pickItem}
                onPress={() => {
                  setSelectedYear(y);
                  setSheetView('filters');
                }}
              >
                <Text style={s.pickText}>{y}</Text>
                {selectedYear === y ? <Icon name="check-circle" size={20} color={T.copper} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {sheetView === 'property' ? (
          <>
            <SearchBox value={propertySearch} onChangeText={setPropertySearch} placeholder="Search property..." />
            {selectedProperty ? (
              <View style={{ gap: 6 }}>
                <Text style={s.section}>Selected</Text>
                <View style={s.selectedBox}>
                  <Text style={s.selectedText} numberOfLines={2}>{selectedProperty.LngName}</Text>
                  <Icon name="check-circle" size={18} color={T.copper} />
                </View>
              </View>
            ) : null}
            <View style={s.pickList}>
              {filteredProps.map((p, i) => {
                const selected = selectedProperty?.PrpCode === p.PrpCode;
                return (
                  <TouchableOpacity
                    key={`${p.PrpCode}-${i}`}
                    style={s.pickItem}
                    onPress={() => {
                      setSelectedProperty(p);
                      setSheetView('filters');
                    }}
                  >
                    <Text style={s.pickText}>{p.LngName}</Text>
                    {selected ? <Icon name="check-circle" size={20} color={T.copper} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  toolbar: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  inner: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingTop: 10, paddingBottom: 10, gap: 10 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  listContent: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingTop: 8, paddingBottom: 28 },
  card: {
    flexDirection: 'row', backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border,
    padding: 14, flexGrow: 1, ...S.card,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 19, fontWeight: '700' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  codeBadge: { backgroundColor: `${T.blue}14`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexShrink: 1 },
  codeText: { color: T.blue, fontSize: 12, fontWeight: '700' },
  statusBadge: { backgroundColor: `${T.green}18`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { color: T.green, fontSize: 11, fontWeight: '700' },
  name: { fontSize: 15.5, fontWeight: '700', color: T.ink, marginTop: 6 },
  address: { fontSize: 12, color: T.muted, marginTop: 4, lineHeight: 16 },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  extraText: { flex: 1, minWidth: 0, fontSize: 12, color: T.ink },
  skel: { height: 12, backgroundColor: T.alt, borderRadius: 6, marginBottom: 6 },
  pickList: { borderWidth: 1, borderColor: T.border, borderRadius: 12, overflow: 'hidden', backgroundColor: T.surface },
  pickItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: T.hair,
  },
  pickText: { flex: 1, minWidth: 0, color: T.ink, fontSize: 14 },
  section: { fontWeight: '700', color: T.ink, fontSize: 13 },
  selectedBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    backgroundColor: `${T.copper}14`, padding: 10, borderRadius: 10,
  },
  selectedText: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '700', color: T.copper },
});
