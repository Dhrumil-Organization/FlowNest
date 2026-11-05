// FILE: components/CheckingScanner/FaultSelector.tsx
//
// Shared FULLSCREEN "Select Faults" UI, used only by ScannerFaultsModal
// (Scanner List row faults — this feature does not exist anywhere else in
// the app any more).
//
// Two INDEPENDENT arrays drive this screen, matching get_checking_fault_help
// exactly (`default_faults` + `filterdata`):
//   - `catalog`      -> default_faults: the fixed master list of every
//                       fault, name-only, always the same set, always
//                       clickable. This is what "Select Faults" renders.
//   - `addedFaults`  -> filterdata: only the faults that are ACTUALLY saved
//                       right now for this row (their own SubSr, which is
//                       just a running record number — NOT the catalog's
//                       SubSr). This is what "Added Faults" renders, each
//                       as a chip with its Remark value + an X.
// The parent (ScannerFaultsModal) owns all the SubSr/duplicate-handling
// logic — this component only ever taps into onAddFault/onRemoveFault and
// re-renders whatever `catalog`/`addedFaults` it's given next.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface FaultCatalogItem {
  Faults: string;
  RDesc: string;
  Remark?: string;
  RsnCode: string;
  SrNo: string;
  SubSr: string;
  UId: string;
}

interface FaultSelectorProps {
  visible: boolean;
  title?: string;
  catalog: FaultCatalogItem[]; // default_faults — the pickable grid
  addedFaults: FaultCatalogItem[]; // filterdata — already-saved faults
  catalogLoading?: boolean;
  busy?: boolean;
  busyItemKey?: string | null;
  beamNo?: string;
  takaNo?: string;
  meter?: string;
  onClose: () => void;
  onAddFault: (fault: FaultCatalogItem, remarkValue: string) => void;
  onRemoveFault: (fault: FaultCatalogItem) => void;
}

const sanitizeRemarkInput = (text: string) => text.replace(/[^0-9\- ]/g, '');

const FaultSelector: React.FC<FaultSelectorProps> = ({
  visible,
  title = 'Select Faults',
  catalog,
  addedFaults,
  catalogLoading = false,
  busy = false,
  busyItemKey = null,
  beamNo = '',
  takaNo = '',
  meter = '',
  onClose,
  onAddFault,
  onRemoveFault,
}) => {
  const [faultValue, setFaultValue] = useState('');
  const [searchText, setSearchText] = useState('');
  const [validationMsg, setValidationMsg] = useState('');

  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web'; // native app build (phone or tablet)
  const isCompact = width < 360;
  const isTablet = width >= 768;
  const isWebWide = Platform.OS === 'web' && width >= 900;

  React.useEffect(() => {
    if (!visible) {
      setSearchText('');
      setFaultValue('');
      setValidationMsg('');
    }
  }, [visible]);

  // Clear the Fault Value box the instant a save/remove finishes.
  const prevBusyRef = React.useRef(busy);
  React.useEffect(() => {
    if (prevBusyRef.current && !busy) {
      setFaultValue('');
    }
    prevBusyRef.current = busy;
  }, [busy]);

  const handleFaultValueChange = (text: string) => {
    setValidationMsg('');
    setFaultValue(sanitizeRemarkInput(text));
  };

  // Fault Value accepts exactly ONE token — either a single number ("44")
  // or a single range ("55-77"). Commas / multiple values are not allowed.
  // Every number in it is checked against the Meter shown at the top of
  // this screen:
  //   - can't be blank / non-numeric
  //   - can't be 0
  //   - can't be greater than Meter
  //   - for a range: the end value must be strictly greater than the
  //     start value ("5-5" is NOT allowed, "5-6" is), and ranges aren't
  //     allowed at all when Meter is 0 or 1 (there's no room for a range
  //     that small).
  const validateFaultValue = (raw: string): string | null => {
    const meterNum = parseFloat(String(meter ?? '').replace(/[^0-9.]/g, ''));
    const meterValue = Number.isFinite(meterNum) ? meterNum : 0;

    const tokens = raw
      .split(',')
      .map((tkn) => tkn.trim())
      .filter((tkn) => tkn.length > 0);

    if (tokens.length === 0) {
      return 'Please enter a Fault Value.';
    }
    if (tokens.length > 1) {
      return 'Only one value or one range is allowed at a time (e.g. "44" or "55-77").';
    }

    for (const token of tokens) {
      const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
      const singleMatch = token.match(/^(\d+)$/);

      if (singleMatch) {
        const n = parseInt(singleMatch[1], 10);
        if (n === 0) return `"${token}" cannot be 0.`;
        if (meterValue > 0 && n > meterValue) {
          return `"${token}" cannot be greater than Meter (${meterValue}).`;
        }
        continue;
      }

      if (rangeMatch) {
        if (meterValue <= 1) {
          return `Range values like "${token}" are not allowed when Meter is ${meterValue}.`;
        }
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (start === 0 || end === 0) return `"${token}" cannot contain 0.`;
        if (start > meterValue) return `Start value in "${token}" cannot be greater than Meter (${meterValue}).`;
        if (end > meterValue) return `End value in "${token}" cannot be greater than Meter (${meterValue}).`;
        if (end < 1) return `End value in "${token}" cannot be less than 1.`;
        if (end <= start) return `End value in "${token}" must be greater than the start value.`;
        continue;
      }

      return `"${token}" is not valid. Use a number (e.g. 12) or a range (e.g. 12-34).`;
    }

    return null;
  };

  const handleChipPress = (item: FaultCatalogItem) => {
    if (busy) return;
    const value = faultValue.trim();
    const error = validateFaultValue(value);
    if (error) {
      setValidationMsg(error);
      return;
    }
    onAddFault(item, value);
  };

  const q = searchText.trim().toLowerCase();
  const matchesQuery = (item: FaultCatalogItem) =>
    !q ||
    (item.RDesc ?? '').toLowerCase().includes(q) ||
    (item.RsnCode ?? '').toLowerCase().includes(q) ||
    String(item.SubSr ?? '').toLowerCase().includes(q) ||
    (item.Faults ?? '').toLowerCase().includes(q) ||
    (item.Remark ?? '').toLowerCase().includes(q);

  const filteredCatalog = useMemo(() => catalog.filter(matchesQuery), [catalog, q]);
  const filteredAdded = useMemo(() => addedFaults.filter(matchesQuery), [addedFaults, q]);

  // Web renders comfortably bigger; the native app build (phone AND
  // tablet) stays compact so more fits without crowding.
  const fontScale = isWebWide ? 1.12 : isCompact ? 0.88 : isMobile ? 0.95 : 1;
  const t = (base: number) => Math.round(base * fontScale);
  const columnsWide = isWebWide || isTablet;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={s.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={[s.page, isWebWide && s.pageWide]}>
          <View style={s.header}>
            <Text style={[s.title, { fontSize: t(20) }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
              <Icon name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>

          {(!!beamNo || !!takaNo || !!meter) && (
            <View style={s.infoCard}>
              <View style={s.infoItem}>
                <Text style={[s.infoLabel, { fontSize: t(10) }]}>Beam No</Text>
                <Text style={[s.infoValue, { fontSize: t(13) }]} numberOfLines={1}>{beamNo || '-'}</Text>
              </View>
              <View style={s.infoDivider} />
              <View style={[s.infoItem, s.takaItem]}>
                <Text style={[s.infoLabel, { fontSize: t(10) }]}>Taka No</Text>
                <Text style={[s.infoValue, { fontSize: t(13) }]} numberOfLines={1}>{takaNo || '-'}</Text>
              </View>
              <View style={s.infoDivider} />
              <View style={s.meterItem}>
                <Text style={[s.infoLabel, { fontSize: t(10) }]}>Meter</Text>
                <Text style={[s.infoValue, { fontSize: t(13) }]} numberOfLines={1}>{meter || '-'}</Text>
              </View>
            </View>
          )}

          <Text style={[s.fieldLabel, { fontSize: t(14) }]}>
            Fault Value <Text style={s.required}>*</Text>
          </Text>
          <TextInput
            style={[s.faultValueInput, { fontSize: t(13) }]}
            placeholder="Enter value (e.g. 44 or 55-77)"
            placeholderTextColor="#94A3B8"
            value={faultValue}
            onChangeText={handleFaultValueChange}
            editable={!busy}
          />
          {!!validationMsg && <Text style={[s.validationMsg, { fontSize: t(11) }]}>{validationMsg}</Text>}

          <View style={s.searchContainer}>
            <Icon name="search" size={19} color="#64748B" style={s.searchIcon} />
            <TextInput
              style={[s.searchInput, { fontSize: t(13) }]}
              placeholder="Search by description or code"
              placeholderTextColor="#94A3B8"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Icon name="close" size={16} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Select Faults — fixed share of the screen, own scroll ── */}
          <Text style={[s.selectLabel, { fontSize: t(13.5) }]}>
            Select Faults <Text style={s.required}>*</Text>
          </Text>
          <View style={s.catalogBox}>
            {catalogLoading ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                <View style={s.faultGrid}>
                  {filteredCatalog.map((item, index) => {
                    const key = `${item.UId ?? ''}_${item.SubSr ?? index}`;
                    const label = item.RDesc || item.Faults || item.RsnCode || `Fault ${index + 1}`;
                    const saving = busy && busyItemKey === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        activeOpacity={0.75}
                        disabled={busy}
                        onPress={() => handleChipPress(item)}
                        style={[s.faultChip, columnsWide && s.faultChipWide]}
                      >
                        {saving ? (
                          <ActivityIndicator size="small" color="#2563EB" />
                        ) : (
                          <Text style={[s.faultChipText, { fontSize: t(12) }]} numberOfLines={2}>
                            {label}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {filteredCatalog.length === 0 && (
                    <Text style={[s.noResultText, { fontSize: t(12) }]}>No matching faults found</Text>
                  )}
                </View>
              </ScrollView>
            )}
          </View>

          {/* ── Added Faults — fixed share of the screen, own scroll ── */}
          <View style={s.sectionHeaderRow}>
            <Text style={[s.selectLabel, { fontSize: t(13.5) }]}>Added Faults</Text>
            <Text style={[s.countBadge, { fontSize: t(11) }]}>{addedFaults.length}</Text>
          </View>
          <View style={s.addedBox}>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
              <View style={s.entriesWrap}>
                {filteredAdded.length === 0 && (
                  <Text style={[s.noResultText, { fontSize: t(12) }]}>
                    {addedFaults.length === 0 ? 'No fault added yet' : 'No matching added faults'}
                  </Text>
                )}
                {filteredAdded.map((item, index) => {
                  const key = `${item.RsnCode ?? ''}_${item.SubSr ?? index}`;
                  const label = item.RDesc || item.Faults || item.RsnCode || 'Fault';
                  const removing = busy && busyItemKey === key;
                  return (
                    <View key={key} style={s.entryChip}>
                      <Text style={[s.entryChipText, { fontSize: t(12) }]} numberOfLines={2}>
                        {label}
                        <Text style={s.entryChipRemark}>  · {item.Remark}</Text>
                      </Text>
                      <TouchableOpacity
                        onPress={() => onRemoveFault(item)}
                        disabled={busy}
                        style={s.entryChipClose}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {removing ? (
                          <ActivityIndicator size="small" color="#B91C1C" />
                        ) : (
                          <Icon name="close" size={14} color="#B91C1C" />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Palette kept muted/professional (slate + blue) instead of bright
// orange/green, consistent across web, tablet and phone.
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  pageWide: { paddingHorizontal: 28, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: '#0F172A', fontWeight: '700' },
  closeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#F1F5F9' },
  infoCard: {
    minHeight: 52,
    backgroundColor: '#F1F5F9',
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoItem: { width: '25%', minWidth: 68 },
  takaItem: { flex: 1, width: undefined },
  meterItem: { width: '18%', minWidth: 50 },
  infoDivider: { width: 1, height: 30, backgroundColor: '#CBD5E1', marginHorizontal: 8 },
  infoLabel: { color: '#64748B', marginBottom: 2, fontWeight: '600' },
  infoValue: { color: '#0F172A', fontWeight: '700' },
  fieldLabel: { color: '#1E293B', fontWeight: '600', marginBottom: 6 },
  required: { color: '#DC2626' },
  faultValueInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  validationMsg: { color: '#DC2626', marginTop: 4 },
  searchContainer: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    marginBottom: 10,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 0, color: '#0F172A' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 },
  selectLabel: { color: '#1E293B', fontWeight: '600' },
  countBadge: {
    color: '#334155',
    fontWeight: '700',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  // Fullscreen layout: catalog gets the bigger share, Added Faults a
  // smaller fixed share — both independently scroll internally so neither
  // ever pushes the other off-screen no matter how much data there is.
  catalogBox: {
    flex: 3,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 8,
  },
  addedBox: {
    flex: 2,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    padding: 8,
    marginBottom: 6,
  },
  entriesWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  entryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    paddingLeft: 11,
    paddingRight: 7,
    paddingVertical: 7,
    marginRight: 7,
    marginBottom: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  entryChipText: { color: '#1D4ED8', fontWeight: '600', maxWidth: 210 },
  entryChipRemark: { color: '#0F172A', fontWeight: '800' },
  entryChipClose: { marginLeft: 7, padding: 2 },
  faultGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  faultChip: {
    minHeight: 40,
    maxWidth: '48%',
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginRight: '2%',
    marginBottom: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faultChipWide: { maxWidth: '23%' },
  faultChipText: { color: '#334155', fontWeight: '500', textAlign: 'center' },
  noResultText: { width: '100%', textAlign: 'center', color: '#94A3B8', marginVertical: 12 },
});

export default FaultSelector;
