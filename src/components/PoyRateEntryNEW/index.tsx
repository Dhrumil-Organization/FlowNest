// FILE: src/components/PoyRateEntryNEW/index.tsx
// NEW ERP — POY Rate Entry (replaces legacy src/components/PoyRateEntry/index.tsx,
// identical copy in components/PoyRateEntry/index.tsx; legacy route app/(tabs)/PoyRateEntry.tsx).
//
// Endpoints (unchanged from legacy, see ./api.ts):
//   GET  /api/get_price_list_poy_items    { prptype (AsyncStorage 'user_prptype'), prpcode:'MTX',
//                                           yearno (AsyncStorage 'yno'), strcode:'001',
//                                           txntype:'mob_poy_rate_entry', appfrom: formatDate(date) }
//   POST /api/save_price_list_poy_items   { prptype, prpcode: item.PrpCode||'', yearno, strcode:'001',
//                                           txntype:'mob_poy_rate_entry', rate (string), srno: item.RSrNo,
//                                           itmcode, itmname, appfrom: item.AppFrom }
//
// Behaviour kept from legacy: reload on date change (list/selection/amount cleared first), auto-select
// first item after a load, keypad rate entry (+ quick-rate chips), 'Please select item' / 'Please enter
// rate' validation, Save & Next (reload, then select + scroll to the next item of the full list),
// failed save = red blinking row (no message, as legacy), Done/Pending/Store KPIs + progress, search.
// Additions (UI only): refresh button, close button on the editor, typed rate input on web
// (same keypad rules), two-pane layout on tablet/web.
import { AppAlert } from '@/common/utils/appAlert';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { fetchPoyItems, isSaveError, readSession, savePoyItem } from './api';
import {
  amountFromItem,
  applyKey,
  DASH,
  filterItems,
  getItemRate,
  getItemSrNo,
  getItemUom,
  isDone,
  KEYPAD,
  PoyItem,
  QUICK_RATES,
  RUPEE,
  sanitizeTyped,
} from './model';
import { PoyDateField } from './PoyDateField';

type Props = { token: string; API: string; username?: string };

const NATIVE_DRIVER = Platform.OS !== 'web';

export default function PoyRateEntryNEW({ token, API }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const desktop = width >= 1180;

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [listData, setListData] = useState<PoyItem[]>([]);
  const [selected, setSelected] = useState<PoyItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState<PoyItem[]>([]);
  const [showKeypad, setShowKeypad] = useState(false);
  const [failedSrNo, setFailedSrNo] = useState<any>(null);
  const failedBlink = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<PoyItem>>(null);

  /* ------------------------------ KPIs (legacy) ----------------------------- */
  const completedCount = useMemo(() => listData.filter(isDone).length, [listData]);
  const totalCount = listData.length;
  const pendingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%';

  /* ------------------------- failed row blink (legacy) ---------------------- */
  useEffect(() => {
    if (!failedSrNo) {
      failedBlink.stopAnimation();
      failedBlink.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(failedBlink, { toValue: 1, duration: 450, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(failedBlink, { toValue: 0, duration: 450, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [failedSrNo, failedBlink]);

  const showWarning = (msg: string) => { AppAlert.alert('Warning', msg); };
  const showError = (msg: string) => { AppAlert.alert('Error', msg); };

  const scrollToItemCode = (itmCode?: string, data: PoyItem[] = filteredData) => {
    if (!itmCode || data.length === 0) return;
    const index = data.findIndex(x => x?.ItmCode === itmCode);
    if (index < 0) return;
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }, 250);
  };

  const markSaveErrorRow = (item: PoyItem, responseData?: any) => {
    const errorSrNo = responseData?.srno ?? responseData?.SrNo ?? responseData?.RSrNo ?? getItemSrNo(item);
    setFailedSrNo(errorSrNo);
  };

  /* --------------------------------- load ----------------------------------- */
  const loadDataGet = async (selectItmCode?: string) => {
    const session = await readSession();
    try {
      setLoading(true);
      setShowKeypad(false);
      setSelected(null);
      setAmount('');

      const result = await fetchPoyItems(API, token, session, date);

      setListData(result);
      setFilteredData(result); // legacy: search text is kept but the list is reset to all rows

      if (result.length > 0) {
        const itemToSelect = result.find((x: any) => x?.ItmCode === selectItmCode) || result[0];
        setSelected(itemToSelect);
        setAmount(amountFromItem(itemToSelect));
        setShowKeypad(true);
        if (selectItmCode) scrollToItemCode(itemToSelect?.ItmCode, result);
      } else {
        setSelected(null);
        setAmount('');
        setShowKeypad(false);
      }
    } catch (error) {
      console.log(error);
      showError('Unable to load POY items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadDataGet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, token]);

  /* --------------------------------- save ----------------------------------- */
  const PoyRateEntrySave = async (item: PoyItem) => {
    if (!amount) {
      showWarning('Please enter rate');
      return;
    }
    const session = await readSession();
    try {
      setLoading(true);
      const data = await savePoyItem(API, token, session, item, amount);

      if (isSaveError(data)) {
        markSaveErrorRow(item, data);
        return;
      }

      setFailedSrNo(null);

      const currentIndex = listData.findIndex(x => x.ItmCode === selected?.ItmCode);
      let nextItemCode = selected?.ItmCode;
      if (currentIndex >= 0 && currentIndex < listData.length - 1) {
        nextItemCode = listData[currentIndex + 1]?.ItmCode;
      }
      await loadDataGet(nextItemCode);
    } catch (error: any) {
      console.log(error);
      markSaveErrorRow(item, error?.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const onSavePress = () => {
    if (!selected) {
      showWarning('Please select item');
      return;
    }
    PoyRateEntrySave({ ...selected, Rate: amount });
  };

  /* ------------------------------ interactions ------------------------------ */
  const onDateChange = (d: Date) => {
    setListData([]);
    setFilteredData([]);
    setSelected(null);
    setAmount('');
    setShowKeypad(false);
    setDate(d);
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    setFilteredData(filterItems(listData, text));
  };

  const clearSearch = () => {
    setSearchText('');
    setFilteredData(listData);
    Keyboard.dismiss();
  };

  const selectItem = (item: PoyItem) => {
    setSelected(item);
    setAmount(amountFromItem(item));
    setShowKeypad(true);
  };

  const handleKeyPress = (key: string) => {
    if (key === 'done') {
      Keyboard.dismiss();
      return;
    }
    const next = applyKey(amount, key);
    if (next !== null) setAmount(next);
  };

  /* --------------------------------- render --------------------------------- */
  const renderItem = ({ item, index }: { item: PoyItem; index: number }) => {
    const active = selected?.ItmCode === item?.ItmCode;
    const rate = getItemRate(item);
    const done = isDone(item);
    const unit = getItemUom(item);
    const failed = failedSrNo != null && getItemSrNo(item) === failedSrNo;

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => selectItem(item)}
        style={[s.row, active && s.rowActive, failed && s.rowFailed]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${item?.ItmName || 'Item'}, rate ${rate || 'not set'}`}
      >
        {failed ? <Animated.View pointerEvents="none" style={[s.failedBar, { opacity: failedBlink }]} /> : null}

        <View style={[s.status, done && s.statusDone, failed && s.statusFailed]}>
          {failed ? (
            <Icon name="close" size={18} color="#fff" />
          ) : done ? (
            <Icon name="check" size={18} color="#fff" />
          ) : (
            <Text style={s.statusText}>{item?.SrNo || index + 1}</Text>
          )}
        </View>

        <View style={s.rowMid}>
          <Text numberOfLines={3} style={s.rowTitle}>{item?.ItmName || '-'}</Text>
          {failed ? <Text style={s.rowFailText}>Not saved</Text> : null}
        </View>

        <View style={s.rowRight}>
          <Text style={[s.rowRate, failed && { color: T.red }]} numberOfLines={1}>
            {rate ? `${RUPEE}${rate}` : DASH}
          </Text>
          <View style={s.uomBadge}>
            <Text style={s.uomText}>{unit}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedUnit = getItemUom(selected);
  const editorVisible = !loading && showKeypad && !!selected;

  const editor = editorVisible ? (
    <View style={[s.editor, wide ? s.editorWide : s.editorPhone]}>
      <View style={s.edHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.eyebrow}>SELECTED ITEM</Text>
          <Text numberOfLines={wide ? 3 : 1} style={s.edItem}>{selected?.ItmName || '-'}</Text>
        </View>
        <View style={s.edUom}><Text style={s.edUomText}>{selectedUnit}</Text></View>
        {!wide ? (
          <TouchableOpacity onPress={() => setShowKeypad(false)} style={s.iconBtn} accessibilityLabel="Hide rate editor">
            <Icon name="expand-more" size={20} color={T.nav} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.amountRow}>
        <Text style={s.currency}>{RUPEE}</Text>
        {Platform.OS === 'web' ? (
          <TextInput
            value={amount}
            onChangeText={t => setAmount(sanitizeTyped(t))}
            placeholder="0"
            placeholderTextColor={T.muted}
            keyboardType="decimal-pad"
            style={s.amountInput}
            onSubmitEditing={() => { if (!loading) onSavePress(); }} // legacy: Save disabled while loading/saving
            accessibilityLabel="Rate"
          />
        ) : (
          <Text adjustsFontSizeToFit numberOfLines={1} style={s.amount}>{amount || '0'}</Text>
        )}
        <Text style={s.amountUnit}>/ {selectedUnit}</Text>
      </View>
      <View style={s.edLine} />

      <View style={s.chips}>
        {QUICK_RATES.map(rate => (
          <TouchableOpacity key={rate} activeOpacity={0.82} onPress={() => setAmount(rate)} style={s.chip}>
            <Text style={s.chipText}>{RUPEE}{rate}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.keypad}>
        {KEYPAD.map(key => {
          const isDoneKey = key === 'done';
          const isBack = key === 'back';
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.84}
              onPress={() => handleKeyPress(key)}
              style={[s.key, !wide && s.keyPhone, isDoneKey && s.doneKey]}
              accessibilityLabel={isBack ? 'Backspace' : isDoneKey ? 'Done' : key}
            >
              {isBack ? (
                <Icon name="backspace" size={19} color={T.ink} />
              ) : isDoneKey ? (
                <Icon name="check" size={22} color="#fff" />
              ) : (
                <Text style={s.keyText}>{key}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity activeOpacity={0.88} disabled={loading} onPress={onSavePress} style={s.saveBtn} accessibilityRole="button">
        <Text style={s.saveText}>{loading ? 'Saving...' : 'Save & Next'}</Text>
        <Icon name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  ) : wide ? (
    <View style={[s.editor, s.editorWide, s.edEmpty]}>
      <Icon name="touch-app" size={30} color={T.muted} />
      <Text style={s.emptyText}>{loading ? 'Loading…' : 'Select an item to enter its rate'}</Text>
    </View>
  ) : null;

  return (
    <View style={s.root}>
      <View style={[s.content, desktop && { maxWidth: 1200 }]}>
        {/* KPI panel + date */}
        <View style={[s.kpiWrap, S.card]}>
          <View style={s.kpiHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.kpiEyebrow}>APPLICABLE FROM</Text>
              <Text style={s.kpiTitle} numberOfLines={1}>POY price list</Text>
            </View>
            <PoyDateField value={date} onChange={onDateChange} disabled={loading} />
          </View>
          <View style={s.kpiRow}>
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>Done</Text>
              <Text style={[s.kpiValue, { color: '#7FD19B' }]}>{completedCount}</Text>
            </View>
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>Pending</Text>
              <Text style={[s.kpiValue, { color: '#F2B85B' }]}>{pendingCount}</Text>
            </View>
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>Store</Text>
              <Text style={[s.kpiValue, { color: '#fff' }]}>POY</Text>
            </View>
          </View>
          <View style={s.progressRow}>
            <View style={s.progress}>
              <View style={[s.progressFill, { width: progressPercent as any }]} />
            </View>
            <Text style={s.progressText}>{completedCount} of {totalCount} completed</Text>
          </View>
        </View>

        {/* toolbar */}
        <View style={s.toolbar}>
          <View style={s.search}>
            <Icon name="search" size={20} color={T.muted} />
            <TextInput
              placeholder="Search an Item..."
              placeholderTextColor={T.muted}
              style={s.searchInput}
              value={searchText}
              onChangeText={handleSearch}
              accessibilityLabel="Search POY items"
            />
            {searchText.length > 0 ? (
              <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Clear search">
                <Icon name="close" size={18} color={T.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={[s.refreshBtn, (loading || !token) && { opacity: 0.5 }]}
            onPress={() => loadDataGet()}
            disabled={loading || !token}
            accessibilityLabel="Refresh"
          >
            <Icon name="refresh" size={20} color={T.nav} />
          </TouchableOpacity>
        </View>

        {/* body */}
        <View style={[s.body, wide && s.bodyWide]}>
          <View style={s.listPane}>
            {loading ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color={T.copper} />
                <Text style={s.emptyText}>Loading POY items…</Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={filteredData}
                renderItem={renderItem}
                keyExtractor={(item, index) =>
                  item?.ItmCode?.toString() || item?.itemcode?.toString() || index.toString()
                }
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 8, paddingBottom: 8, flexGrow: 1 }}
                onScrollToIndexFailed={info => {
                  setTimeout(() => {
                    listRef.current?.scrollToOffset({
                      offset: Math.max(0, info.averageItemLength * info.index),
                      animated: true,
                    });
                    setTimeout(() => {
                      listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                    }, 150);
                  }, 150);
                }}
                ListEmptyComponent={
                  <View style={s.empty}>
                    <Icon name="inventory-2" size={30} color={T.muted} />
                    <Text style={s.emptyText}>No POY item found</Text>
                  </View>
                }
              />
            )}
          </View>
          {editor}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { flex: 1, width: '100%', alignSelf: 'center', paddingHorizontal: 12, paddingTop: 12, gap: 10 },

  kpiWrap: { backgroundColor: T.nav, borderRadius: 14, padding: 12, gap: 10 },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kpiEyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
  kpiTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginTop: 1 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.6, textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progress: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: T.copper },
  progressText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  toolbar: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  search: {
    flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10,
    borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: T.ink, height: 42, minWidth: 0 },
  refreshBtn: {
    width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: T.border,
    backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center',
  },

  body: { flex: 1, minHeight: 0 },
  bodyWide: { flexDirection: 'row', gap: 12, paddingBottom: 12 },
  listPane: { flex: 1, minHeight: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  empty: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 6,
    backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border,
  },
  emptyText: { fontSize: 13, fontWeight: '600', color: T.muted, textAlign: 'center' },

  row: {
    minHeight: 60, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden',
  },
  rowActive: { borderColor: T.copper, backgroundColor: '#FDF6EF', borderWidth: 1.5 },
  rowFailed: { borderColor: T.red, backgroundColor: '#FFF4F2' },
  failedBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: T.red },
  status: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  statusDone: { backgroundColor: T.green },
  statusFailed: { backgroundColor: T.red },
  statusText: { fontSize: 12, fontWeight: '800', color: T.nav },
  rowMid: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 13.5, fontWeight: '700', color: T.ink, lineHeight: 18 },
  rowFailText: { fontSize: 11, fontWeight: '700', color: T.red, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', minWidth: 54, maxWidth: 110, gap: 4 },
  rowRate: { fontSize: 14, fontWeight: '800', color: T.nav },
  uomBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: '#FBF1E8', borderWidth: 1, borderColor: '#F0D3B8' },
  uomText: { fontSize: 10, fontWeight: '800', color: T.copper },

  editor: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 12, gap: 8 },
  editorPhone: { marginHorizontal: -12, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomWidth: 0, ...S.sheet },
  editorWide: { width: 380, borderRadius: 14, alignSelf: 'flex-start', ...S.card },
  edEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  edHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
  edItem: { fontSize: 15, fontWeight: '800', color: T.nav, marginTop: 2 },
  edUom: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  edUomText: { fontSize: 11, fontWeight: '800', color: T.nav },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  currency: { fontSize: 26, fontWeight: '800', color: T.ink, marginBottom: 4 },
  amount: { flexShrink: 1, fontSize: 34, lineHeight: 42, fontWeight: '800', color: T.ink },
  amountInput: {
    flex: 1, minWidth: 0, fontSize: 30, fontWeight: '800', color: T.ink, height: 44,
    borderBottomWidth: 0, paddingVertical: 0,
  },
  amountUnit: { fontSize: 12, fontWeight: '700', color: T.muted, marginBottom: 8 },
  edLine: { height: 1.5, backgroundColor: T.copper, borderRadius: 2 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#F0D3B8', backgroundColor: '#FDF8F3',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  chipText: { fontSize: 12, fontWeight: '800', color: T.copper },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  key: {
    width: '23.5%', height: 42, borderRadius: 9, borderWidth: 1, borderColor: T.border,
    backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center',
  },
  keyPhone: { height: 36 },
  doneKey: { width: '48.8%', backgroundColor: T.green, borderColor: T.green },
  keyText: { fontSize: 16, fontWeight: '800', color: T.ink },
  saveBtn: {
    height: 44, borderRadius: 10, backgroundColor: T.copper, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2,
  },
  saveText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
