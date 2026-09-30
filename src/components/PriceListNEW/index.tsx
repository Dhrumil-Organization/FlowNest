// FILE: src/components/PriceListNEW/index.tsx
// NEW ERP — Price List (replaces legacy src/components/PriceList/index.tsx,
// identical copy components/PriceList/index.tsx; legacy route app/(tabs)/price-list.tsx).
//
// APIs (same as legacy, see ./api.ts):
//   GET  /api/get_price_list   params { prptype: AsyncStorage 'user_prptype', prpcode:'MTX',
//                                       yearno: AsyncStorage 'yno', strcode:'002',
//                                       txntype:'mob_price_list', month:'MM' }
//        -> response.data.data = rows { ItmCode, ItmName, PLDate(yyyymmdd), PLRate, Status }
//   POST /api/save_price_list  body   { prptype, prpcode:'MTX', yearno, itmcode, date, rate (string as typed),
//                                       txntype:'mob_price_list' }  (+ X-Requested-With header)
//        -> on success the edited cell is patched locally (no reload), like legacy.
//
// Behaviour kept: month picker (defaults to current month) reloads the list; refresh on
// screen focus (useFocusEffect on selected month) + initial load; search on item name/code/
// rate/date; item × rate-date matrix with Higher/Lower/Missing/Same colouring; tap a rate to
// edit inline, saved on submit or blur; unmapped items (Status === "0") highlighted and
// tapping them shows the "not mapped in the POY Rate Item List" message.
// Legacy "Add new rate date" did router.push('/PoyRateEntry') — POY Rate Entry is its own
// NEW ERP module now, so the button only explains where to add a new rate date.
import { AppAlert } from '@/common/utils/appAlert';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Btn, Sheet } from '../StockVerificationNEW/ui';
import { fetchPriceList, PriceRow, savePriceRate } from './api';
import {
  buildDateColumns,
  buildRateMap,
  buildUniqueItems,
  cellKey,
  filterRows,
  isUnmapped,
  monthNoOf,
  MONTHS,
  RateKind,
  rateKind,
  UNMAPPED_MSG,
} from './model';

type Props = { token: string; API: string; username?: string };

const KIND: Record<RateKind, { bg: string; fg: string; border: string; label: string }> = {
  higher: { bg: '#DDEFE3', fg: T.green, border: '#BFDCC9', label: 'Higher' },
  lower: { bg: '#FBEBD3', fg: '#8A5A0B', border: '#F0D3A6', label: 'Lower' },
  missing: { bg: '#F8DEDA', fg: T.red, border: '#EFC3BC', label: 'Missing' },
  same: { bg: '#ECE2F3', fg: T.purple, border: '#D9C6E6', label: 'Same' },
  normal: { bg: T.surface, fg: T.ink, border: T.border, label: 'Normal' },
};
const LEGEND: RateKind[] = ['higher', 'lower', 'missing', 'same'];
const UNMAPPED_BG = '#EAF0FA';

export default function PriceListNEW({ token, API }: Props) {
  const { width } = useWindowDimensions();
  const phone = width < 768;
  const wide = width >= 1180;
  const ITEM_W = phone ? 138 : wide ? 300 : 230;
  const DATE_W = phone ? 86 : 106;
  const ROW_H = phone ? 62 : 58;

  const currentMonth = new Date().getMonth();
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [tempMonth, setTempMonth] = useState(currentMonth);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const searchRef = useRef<TextInput>(null);
  const reqSeq = useRef(0);
  // One save per edit session (legacy fired on both submit and blur → duplicate POSTs).
  const editSession = useRef<{ key: string; saved: boolean } | null>(null);

  /* ------------------------------- load -------------------------------- */
  const loadList = useCallback(async (month: string) => {
    const seq = ++reqSeq.current;
    try {
      setLoading(true);
      setLoadError('');
      const result = await fetchPriceList(API, token, month);
      if (seq !== reqSeq.current) return;
      setRows(result);
    } catch (error) {
      console.log(error);
      if (seq === reqSeq.current) setLoadError('Could not load the price list. Pull down or tap refresh to try again.');
    } finally {
      if (seq === reqSeq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [API, token]);

  // Legacy: initial load for the current month …
  useEffect(() => {
    loadList(monthNoOf(currentMonth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // … and reload for the selected month every time the screen gains focus.
  useFocusEffect(
    useCallback(() => {
      loadList(monthNoOf(selectedMonth));
    }, [selectedMonth, loadList]),
  );

  const refresh = () => {
    setRefreshing(true);
    loadList(monthNoOf(selectedMonth));
  };

  /* ------------------------------ derived ------------------------------ */
  const dateColumns = useMemo(() => buildDateColumns(rows), [rows]);
  const filtered = useMemo(() => filterRows(rows, search), [rows, search]);
  const uniqueItems = useMemo(() => buildUniqueItems(filtered), [filtered]);
  const rateMap = useMemo(() => buildRateMap(rows), [rows]);

  const kpi = useMemo(() => {
    let missing = 0;
    uniqueItems.forEach((it) => dateColumns.forEach((c) => {
      if (Number(rateMap[cellKey(it.ItmCode, c.rawDate)]?.PLRate || 0) === 0) missing += 1;
    }));
    return { items: uniqueItems.length, dates: dateColumns.length, missing, unmapped: uniqueItems.filter(isUnmapped).length };
  }, [uniqueItems, dateColumns, rateMap]);

  /* ------------------------------ actions ------------------------------ */
  const clearSearch = () => {
    searchRef.current?.clear();
    searchRef.current?.blur();
    Keyboard.dismiss();
    setTimeout(() => setSearch(''), 0);
  };

  const startEdit = (itemCode: string, date: string) => {
    const key = cellKey(itemCode, date);
    const rowData = rateMap[key];
    editSession.current = { key, saved: false };
    setEditingCell(key);
    setEditingValue(Number(rowData?.PLRate || 0) === 0 ? '' : String(rowData?.PLRate));
  };

  const handleInlineSave = async (itemCode: string, date: string, value: string) => {
    const key = cellKey(itemCode, date);
    const sess = editSession.current;
    if (!sess || sess.key !== key || sess.saved) return;
    sess.saved = true;
    setSavingCell(key);
    setSaveError('');
    try {
      await savePriceRate(API, token, itemCode, date, value);
      setRows((prev) => prev.map((item) =>
        item.ItmCode === itemCode && item.PLDate === date ? { ...item, PLRate: value } : item,
      ));
    } catch (e) {
      console.log(e);
      setSaveError(`Could not save the rate for ${itemCode} (${fmtDate(date)}).`);
    } finally {
      setSavingCell((c) => (c === key ? null : c));
      setEditingCell((c) => (c === key ? null : c));
      if (editSession.current === sess) editSession.current = null;
    }
  };

  const showUnmapped = (name: string) => AppAlert.alert(name, UNMAPPED_MSG);

  const handleAddNewRateDate = () => {
    AppAlert.alert(
      'Add new rate date',
      'New rate dates are entered in the POY Rate Entry module. Open POY Rate Entry from the NEW ERP menu — this price list reloads automatically when you come back.',
    );
  };

  const openMonthPicker = () => {
    setTempMonth(selectedMonth);
    setShowMonthPicker(true);
  };

  const applyMonth = () => {
    const selectedMonthNo = monthNoOf(tempMonth);
    setSelectedMonth(tempMonth);
    setShowMonthPicker(false);
    loadList(selectedMonthNo);
  };

  /* ------------------------------- render ------------------------------ */
  const renderGrid = () => {
    if (loading && !refreshing) {
      return (
        <View style={st.state}>
          <ActivityIndicator size="large" color={T.copper} />
          <Text style={st.stateText}>Loading price list…</Text>
        </View>
      );
    }
    if (uniqueItems.length === 0) {
      return (
        <View style={st.state}>
          <Icon name={search ? 'search-off' : 'price-change'} size={34} color={T.muted} />
          <Text style={st.stateText}>
            {search ? `No item matches “${search.trim()}”.` : `No prices for ${MONTHS[selectedMonth]}.`}
          </Text>
        </View>
      );
    }

    return (
      <View style={{ flexDirection: 'row' }}>
        {/* Sticky item column */}
        <View style={{ width: ITEM_W, borderRightWidth: 1, borderRightColor: T.border }}>
          <View style={[st.headCell, { height: 40, paddingHorizontal: 12, alignItems: 'flex-start' }]}>
            <Text style={st.headText}>ITEMS</Text>
          </View>
          {uniqueItems.map((item) => {
            const un = isUnmapped(item);
            return (
              <TouchableOpacity
                key={item.ItmCode}
                activeOpacity={un ? 0.7 : 1}
                disabled={!un}
                onPress={() => showUnmapped(item.ItmName)}
                style={[st.itemCell, { height: ROW_H }, un && st.itemUnmapped]}
                accessibilityRole={un ? 'button' : undefined}
              >
                <View style={{ flex: 1 }}>
                  <Text style={st.itemName} numberOfLines={2}>{item.ItmName}</Text>
                  <Text style={st.itemCode} numberOfLines={1}>{item.ItmCode}</Text>
                </View>
                {un ? <Icon name="info-outline" size={16} color={T.blue} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Rate dates — scroll horizontally inside the card */}
        <ScrollView horizontal showsHorizontalScrollIndicator keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
          <View>
            <View style={[st.headRow, { height: 40 }]}>
              {dateColumns.map((d) => (
                <View key={d.rawDate} style={[st.headDate, { width: DATE_W }]}>
                  <Text style={st.headText} numberOfLines={1}>{d.day} {d.month}</Text>
                </View>
              ))}
            </View>
            {uniqueItems.map((item) => {
              const un = isUnmapped(item);
              return (
                <View key={item.ItmCode} style={[st.rateRow, { height: ROW_H }, un && { backgroundColor: UNMAPPED_BG }]}>
                  {dateColumns.map((col) => {
                    const key = cellKey(item.ItmCode, col.rawDate);
                    const rowData = rateMap[key];
                    const k = KIND[rateKind(rateMap, dateColumns, item.ItmCode, col.rawDate)];
                    const editing = editingCell === key;
                    const saving = savingCell === key;
                    return (
                      <View key={key} style={[st.rateCell, { width: DATE_W }]}>
                        {editing ? (
                          <View style={[st.badge, st.badgeEdit]}>
                            {saving ? (
                              <ActivityIndicator size="small" color={T.copper} />
                            ) : (
                              <TextInput
                                autoFocus
                                keyboardType="numeric"
                                returnKeyType="done"
                                value={editingValue}
                                onChangeText={setEditingValue}
                                onBlur={() => handleInlineSave(item.ItmCode, col.rawDate, editingValue)}
                                onSubmitEditing={() => handleInlineSave(item.ItmCode, col.rawDate, editingValue)}
                                selectTextOnFocus
                                style={st.editInput}
                                accessibilityLabel={`Rate for ${item.ItmName} on ${d2(col)}`}
                              />
                            )}
                          </View>
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => startEdit(item.ItmCode, col.rawDate)}
                            style={[st.badge, { backgroundColor: k.bg, borderColor: k.border }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit rate for ${item.ItmName} on ${d2(col)}`}
                          >
                            <Text style={[st.rateText, { color: k.fg }]} numberOfLines={1}>
                              ₹ {Number(rowData?.PLRate || 0) > 0 ? rowData?.PLRate : '0'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={st.root}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[st.content, wide && st.contentWide]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.copper} colors={[T.copper]} />}
      >
        {/* Toolbar */}
        <View style={st.toolRow}>
          <TouchableOpacity style={st.monthBtn} onPress={openMonthPicker} accessibilityRole="button" accessibilityLabel={`Month: ${MONTHS[selectedMonth]}`}>
            <Icon name="calendar-month" size={18} color={T.copper} />
            <View style={{ flexShrink: 1 }}>
              <Text style={st.eyebrow}>MONTH</Text>
              <Text style={st.monthText} numberOfLines={1}>{phone ? MONTHS[selectedMonth].substring(0, 3) : MONTHS[selectedMonth]}</Text>
            </View>
            <Icon name="expand-more" size={20} color={T.muted} />
          </TouchableOpacity>

          <View style={st.search}>
            <Icon name="search" size={18} color={T.muted} />
            <TextInput
              ref={searchRef}
              value={search}
              onChangeText={setSearch}
              placeholder="Search an Item..."
              placeholderTextColor={T.muted}
              style={st.searchInput}
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Clear search">
                <Icon name="close" size={18} color={T.muted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity style={st.iconBtn} onPress={refresh} disabled={loading} accessibilityLabel="Refresh">
            {loading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={20} color={T.nav} />}
          </TouchableOpacity>
        </View>

        {/* KPIs */}
        <View style={st.kpiRow}>
          <Kpi label="ITEMS" value={kpi.items} color={T.nav} />
          <Kpi label="RATE DATES" value={kpi.dates} color={T.copper} />
          <Kpi label="MISSING RATES" value={kpi.missing} color={T.red} />
          <Kpi label="UNMAPPED" value={kpi.unmapped} color={T.blue} />
        </View>

        {/* Legend */}
        <View style={st.legendRow}>
          {LEGEND.map((k) => (
            <View key={k} style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: KIND[k].bg, borderColor: KIND[k].border }]} />
              <Text style={st.legendText}>{KIND[k].label}</Text>
            </View>
          ))}
          <View style={st.legendItem}>
            <View style={[st.legendDot, { backgroundColor: UNMAPPED_BG, borderColor: T.blue }]} />
            <Text style={st.legendText}>Not mapped</Text>
          </View>
        </View>

        {!!loadError && <ErrBox text={loadError} onClose={() => setLoadError('')} />}
        {!!saveError && <ErrBox text={saveError} onClose={() => setSaveError('')} />}

        <View style={st.card}>{renderGrid()}</View>

        <Text style={st.hint}>Tap a rate to edit it — it is saved when you press done or leave the field.</Text>

        <TouchableOpacity style={st.addBtn} onPress={handleAddNewRateDate} accessibilityRole="button">
          <Icon name="event" size={18} color={T.copper} />
          <Text style={st.addText}>Add new rate date</Text>
          <Icon name="info-outline" size={16} color={T.muted} />
        </TouchableOpacity>
      </ScrollView>

      <Sheet
        open={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        eyebrow="PRICE LIST"
        title="Select Month"
        wideMax={520}
        footer={
          <>
            <Btn label="Cancel" kind="ghost" onPress={() => setShowMonthPicker(false)} style={{ flex: 1 }} />
            <Btn label="Apply" kind="copper" onPress={applyMonth} style={{ flex: 1 }} />
          </>
        }
      >
        <View style={st.monthGrid}>
          {MONTHS.map((m, i) => {
            const on = tempMonth === i;
            return (
              <TouchableOpacity
                key={m}
                style={[st.monthChip, on && st.monthChipOn]}
                onPress={() => setTempMonth(i)}
                accessibilityState={{ selected: on }}
              >
                <Text style={[st.monthChipText, on && { color: '#fff' }]}>{m.substring(0, 3)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

/* ------------------------------ small pieces ----------------------------- */

const d2 = (c: { day: string; month: string }) => `${c.day} ${c.month}`;
const fmtDate = (raw: string) => {
  const s = String(raw ?? '');
  return s.length >= 8 ? `${s.substring(6, 8)}-${s.substring(4, 6)}-${s.substring(0, 4)}` : s;
};

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[st.kpi, { borderTopColor: color }]}>
      <Text style={st.kpiLbl} numberOfLines={1}>{label}</Text>
      <Text style={[st.kpiVal, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ErrBox({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <View style={st.errBox}>
      <Icon name="error-outline" size={16} color={T.red} />
      <Text style={st.errText}>{text}</Text>
      <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Dismiss">
        <Icon name="close" size={16} color={T.red} />
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 12, paddingBottom: 24, gap: 10 },
  contentWide: { maxWidth: 1200, width: '100%', alignSelf: 'center', paddingHorizontal: 18 },

  toolRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  monthBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7, height: 44, paddingHorizontal: 10,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10,
  },
  eyebrow: { fontSize: 9, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
  monthText: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  search: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7, height: 44,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 11,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 13, color: T.ink, paddingVertical: 0 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
  },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpi: {
    flexGrow: 1, flexBasis: 72, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border,
    borderTopWidth: 3, paddingHorizontal: 10, paddingVertical: 7,
  },
  kpiLbl: { fontSize: 9, fontWeight: '800', color: T.muted, letterSpacing: 0.4 },
  kpiVal: { fontSize: 16, fontWeight: '800', marginTop: 2 },

  legendRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, paddingHorizontal: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 4, borderWidth: 1 },
  legendText: { fontSize: 11.5, fontWeight: '600', color: T.ink },

  errBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FCEDEA', borderRadius: 9, padding: 9 },
  errText: { flex: 1, color: T.red, fontSize: 11.5, fontWeight: '700' },

  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden', ...S.card },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 16, gap: 10 },
  stateText: { fontSize: 13, color: T.muted, fontWeight: '600', textAlign: 'center' },

  headRow: { flexDirection: 'row', backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.border },
  headCell: { justifyContent: 'center', alignItems: 'center', backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.border },
  headDate: { justifyContent: 'center', alignItems: 'center' },
  headText: { fontSize: 11, fontWeight: '800', color: T.nav, letterSpacing: 0.4 },

  itemCell: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: T.hair, borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  itemUnmapped: { backgroundColor: UNMAPPED_BG, borderLeftColor: T.blue },
  itemName: { fontSize: 12.5, fontWeight: '700', color: T.ink, lineHeight: 16 },
  itemCode: { fontSize: 10.5, fontWeight: '500', color: T.muted, marginTop: 2 },

  rateRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.hair },
  rateCell: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  badge: {
    width: '100%', height: 38, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeEdit: { backgroundColor: T.surface, borderColor: T.copper, borderWidth: 1.5 },
  editInput: { width: '100%', height: '100%', textAlign: 'center', fontSize: 14, fontWeight: '700', color: T.ink, paddingVertical: 0 },
  rateText: { fontSize: 13, fontWeight: '700' },

  hint: { fontSize: 11, color: T.muted, fontWeight: '500', paddingHorizontal: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44,
    borderRadius: 10, borderWidth: 1.5, borderColor: T.copper, backgroundColor: T.surface,
  },
  addText: { fontSize: 14, fontWeight: '800', color: T.copper },

  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthChip: {
    flexGrow: 1, flexBasis: '30%', height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.alt, borderWidth: 1, borderColor: T.border,
  },
  monthChipOn: { backgroundColor: T.nav, borderColor: T.nav },
  monthChipText: { fontSize: 14, fontWeight: '700', color: T.nav },
});
