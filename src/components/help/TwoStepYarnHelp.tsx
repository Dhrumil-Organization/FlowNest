import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  DesignAPI,
  type YarnMainRow,
  type YarnMaster,
} from '../../../common/API/client_fix_design';

export type YarnHelpPurpose = 'warp' | 'weft' | 'selvedge';

type Props = {
  visible: boolean;
  purpose: YarnHelpPurpose;
  prpcode?: string;
  strcode?: string;
  yearno?: string;
  onClose: () => void;
  onSelect: (item: YarnMaster) => void;
};

type HelpStage = 'main' | 'items';

const getErrorMessage = (error: unknown): string => {
  const value = error as any;

  return String(
    value?.response?.data?.message ||
    value?.response?.data?.error ||
    value?.message ||
    'Unable to load yarn help.',
  );
};

const getPurposeTitle = (purpose: YarnHelpPurpose): string => {
  if (purpose === 'warp') {
    return 'Warp Yarn';
  }

  if (purpose === 'weft') {
    return 'Weft Yarn';
  }

  return 'Selvedge Yarn';
};

export function TwoStepYarnHelp({
  visible,
  purpose,
  prpcode = 'SIP',
  strcode = '002',
  yearno = '27',
  onClose,
  onSelect,
}: Props) {
  const [stage, setStage] = useState<HelpStage>('main');

  const [mainSearch, setMainSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  const [mainRows, setMainRows] = useState<YarnMainRow[]>([]);
  const [itemRows, setItemRows] = useState<YarnMaster[]>([]);

  const [selectedMain, setSelectedMain] =
    useState<YarnMainRow | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestIdRef = useRef(0);

  const resetAll = useCallback(() => {
    requestIdRef.current += 1;

    setStage('main');
    setMainSearch('');
    setItemSearch('');
    setMainRows([]);
    setItemRows([]);
    setSelectedMain(null);
    setLoading(false);
    setError('');
  }, []);

  useEffect(() => {
    if (!visible) {
      resetAll();
    }
  }, [resetAll, visible]);

  const loadMainYarns = useCallback(async () => {
    if (!visible || stage !== 'main') {
      return;
    }

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError('');

    try {
      const response = await DesignAPI.mainYarns({
        yearno,
        prpcode,
        strcode,
        search: mainSearch.trim() || undefined,
        limit: 100,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      const payload = response?.data;

      if (payload?.success !== true) {
        throw new Error(
          payload?.message || 'Unable to load main yarns.',
        );
      }

      setMainRows(
        Array.isArray(payload.data)
          ? payload.data
          : [],
      );
    } catch (loadError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setMainRows([]);
      setError(getErrorMessage(loadError));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    mainSearch,
    prpcode,
    stage,
    strcode,
    visible,
    yearno,
  ]);

  const loadYarnItems = useCallback(async () => {
    if (
      !visible ||
      stage !== 'items' ||
      !selectedMain
    ) {
      return;
    }

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError('');

    try {
      const response = await DesignAPI.yarnItems({
        yearno,
        prpcode,
        strcode,
        main_yarn_code:
          selectedMain.main_yarn_code,
        search: itemSearch.trim() || undefined,
        limit: 250,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      const payload = response?.data;

      if (payload?.success !== true) {
        throw new Error(
          payload?.message ||
          'Unable to load yarn items.',
        );
      }

      setItemRows(
        Array.isArray(payload.data)
          ? payload.data
          : [],
      );
    } catch (loadError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setItemRows([]);
      setError(getErrorMessage(loadError));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    itemSearch,
    prpcode,
    selectedMain,
    stage,
    strcode,
    visible,
    yearno,
  ]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = setTimeout(() => {
      if (stage === 'main') {
        void loadMainYarns();
      } else {
        void loadYarnItems();
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [
    loadMainYarns,
    loadYarnItems,
    stage,
    visible,
  ]);

  const closeHelp = useCallback(() => {
    resetAll();
    onClose();
  }, [onClose, resetAll]);

  const openItems = useCallback(
    (mainRow: YarnMainRow) => {
      requestIdRef.current += 1;

      setSelectedMain(mainRow);
      setStage('items');
      setItemSearch('');
      setItemRows([]);
      setError('');
      setLoading(false);
    },
    [],
  );

  const backToMain = useCallback(() => {
    requestIdRef.current += 1;

    setStage('main');
    setSelectedMain(null);
    setItemSearch('');
    setItemRows([]);
    setError('');
    setLoading(false);

    /*
     * Main search and loaded main rows are intentionally preserved.
     * The user can immediately choose another Main Yarn.
     */
  }, []);

  const selectItem = useCallback(
    (item: YarnMaster) => {
      onSelect(item);
      closeHelp();
    },
    [closeHelp, onSelect],
  );

  const retry = useCallback(() => {
    if (stage === 'main') {
      void loadMainYarns();
      return;
    }

    void loadYarnItems();
  }, [loadMainYarns, loadYarnItems, stage]);

  const purposeTitle = getPurposeTitle(purpose);

  const modalTitle =
    stage === 'main'
      ? `Select ${purposeTitle}`
      : 'Select Yarn Item';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      // presentationStyle="fullScreen"
      onRequestClose={
        stage === 'items'
          ? backToMain
          : closeHelp
      }
    >
      {/* <SafeAreaView style={styles.safe}> */}
      <View style={styles.overlay}>
        <View style={styles.bottomSheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerAction}
              activeOpacity={0.7}
              onPress={
                stage === 'items'
                  ? backToMain
                  : closeHelp
              }
            >
              <Text style={styles.headerActionText}>
                {stage === 'items'
                  ? '‹ Main Yarn'
                  : 'Close'}
              </Text>
            </TouchableOpacity>

            <Text
              style={styles.headerTitle}
              numberOfLines={1}
            >
              {modalTitle}
            </Text>

            <View style={styles.headerSpacer} />
          </View>

          {stage === 'items' && selectedMain ? (
            <View style={styles.selectedMainCard}>
              <Text style={styles.selectedMainLabel}>
                MAIN YARN
              </Text>

              <Text style={styles.selectedMainCode}>
                {selectedMain.main_yarn_code}
              </Text>

              <Text
                style={styles.selectedMainName}
                numberOfLines={2}
              >
                {selectedMain.name}
              </Text>

              <View style={styles.selectedMainMetaRow}>
                <Text style={styles.selectedMainMeta}>
                  {selectedMain.variant_count} item
                  {selectedMain.variant_count === 1
                    ? ''
                    : 's'}
                </Text>

                {selectedMain.available_blends?.length >
                  0 ? (
                  <Text
                    style={styles.selectedMainBlend}
                    numberOfLines={1}
                  >
                    {selectedMain.available_blends.join(
                      ' · ',
                    )}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={
                stage === 'main'
                  ? mainSearch
                  : itemSearch
              }
              onChangeText={
                stage === 'main'
                  ? setMainSearch
                  : setItemSearch
              }
              placeholder={
                stage === 'main'
                  ? 'Search Main Yarn code or name'
                  : 'Search item code, name or blend'
              }
              placeholderTextColor="#87929A"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                {error}
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={retry}
              >
                <Text style={styles.retryText}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading &&
            (stage === 'main'
              ? mainRows.length === 0
              : itemRows.length === 0) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>
                Loading yarns…
              </Text>
            </View>
          ) : stage === 'main' ? (
            <FlatList
              data={mainRows}
              keyExtractor={(item) =>
                item.main_yarn_code
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.listContent
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.72}
                  onPress={() => openItems(item)}
                >
                  <View style={styles.rowBody}>
                    <Text style={styles.code}>
                      {item.main_yarn_code}
                    </Text>

                    <Text
                      style={styles.name}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>

                    <View style={styles.metaRow}>
                      <Text style={styles.meta}>
                        {item.variant_count} item
                        {item.variant_count === 1
                          ? ''
                          : 's'}
                      </Text>

                      {item.available_blends?.length >
                        0 ? (
                        <Text
                          style={styles.blendPreview}
                          numberOfLines={1}
                        >
                          {item.available_blends.join(
                            ' · ',
                          )}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <Text style={styles.chevron}>
                    ›
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !loading ? (
                  <View
                    style={styles.emptyContainer}
                  >
                    <Text style={styles.emptyText}>
                      {mainSearch.trim()
                        ? 'No Main Yarn found.'
                        : 'No Main Yarn is available.'}
                    </Text>
                  </View>
                ) : null
              }
            />
          ) : (
            <FlatList
              data={itemRows}
              keyExtractor={(item) =>
                `${item.main_yarn_code}:${item.itm_code}`
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.listContent
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.72}
                  onPress={() => selectItem(item)}
                >
                  <View style={styles.rowBody}>
                    <View
                      style={styles.itemTitleRow}
                    >
                      <Text style={styles.code}>
                        {item.itm_code}
                      </Text>

                      {item.is_main_yarn_item ? (
                        <View
                          style={styles.mainBadge}
                        >
                          <Text
                            style={
                              styles.mainBadgeText
                            }
                          >
                            MAIN
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text
                      style={styles.name}
                      numberOfLines={2}
                    >
                      {item.name ||
                        item.itm_name ||
                        item.itm_code}
                    </Text>

                    <View style={styles.metaRow}>
                      {item.blend_ratio ? (
                        <View
                          style={styles.blendChip}
                        >
                          <Text
                            style={
                              styles.blendChipText
                            }
                          >
                            Blend {item.blend_ratio}
                          </Text>
                        </View>
                      ) : null}

                      {item.sys ? (
                        <Text style={styles.meta}>
                          {item.sys}{' '}
                          {Number(item.cnt) > 0
                            ? item.cnt
                            : Number(item.denier) > 0
                              ? item.denier
                              : ''}
                        </Text>
                      ) : null}

                      {Number(item.price) > 0 ? (
                        <Text style={styles.meta}>
                          ₹
                          {Number(
                            item.price,
                          ).toFixed(2)}
                        </Text>
                      ) : null}
                    </View>

                    {item.engineering_warning ? (
                      <Text
                        style={styles.warningText}
                        numberOfLines={2}
                      >
                        {item.engineering_warning}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !loading ? (
                  <View
                    style={styles.emptyContainer}
                  >
                    <Text style={styles.emptyText}>
                      No item is maintained under this
                      Main Yarn.
                    </Text>

                    <TouchableOpacity
                      style={
                        styles.changeMainButton
                      }
                      activeOpacity={0.72}
                      onPress={backToMain}
                    >
                      <Text
                        style={
                          styles.changeMainButtonText
                        }
                      >
                        Choose another Main Yarn
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          )}

          {loading &&
            (stage === 'main'
              ? mainRows.length > 0
              : itemRows.length > 0) ? (
            <View style={styles.inlineLoader}>
              <ActivityIndicator size="small" />
            </View>
          ) : null}
        </View>
      </View>
      {/* </SafeAreaView> */}
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    height: "65%",      // pehle 80% tha
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  handle: {
    width: 45,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  safe: {
    flex: 1,
    backgroundColor: '#F5F6F7',
  },

  header: {
    minHeight: 40,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: '#24333D',
    backgroundColor: "#fff",
  },

  headerAction: {
    width: 88,
    minHeight: 44,
    justifyContent: 'center',
  },

  headerActionText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    
  },

  headerSpacer: {
    width: 88,
  },

  selectedMainCard: {
    marginHorizontal: 14,
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D8DEE3',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },

  selectedMainLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#66727B',
    letterSpacing: 0.7,
  },

  selectedMainCode: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: '900',
    color: '#1D2930',
  },

  selectedMainName: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#53616A',
  },

  selectedMainMetaRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  selectedMainMeta: {
    fontSize: 10.5,
    color: '#6B7780',
  },

  selectedMainBlend: {
    flex: 1,
    fontSize: 10.5,
    color: '#A4602D',
  },

  searchContainer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  searchInput: {
    minHeight: 46,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#D1D9DF',
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    color: '#1D2930',
    fontSize: 14,
  },

  errorCard: {
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0C3C0',
    borderRadius: 10,
    backgroundColor: '#FFF1F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorText: {
    flex: 1,
    color: '#9B2C2C',
    fontSize: 12,
    lineHeight: 16,
  },

  retryText: {
    marginLeft: 12,
    color: '#9B2C2C',
    fontSize: 12,
    fontWeight: '800',
  },

  loadingContainer: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 10,
    color: '#6B7780',
    fontSize: 12,
  },

  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 32,
  },

  row: {
    minHeight: 82,
    marginBottom: 9,
    padding: 13,
    borderWidth: 1,
    borderColor: '#DCE2E6',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowBody: {
    flex: 1,
  },

  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  code: {
    color: '#1D2930',
    fontSize: 14,
    fontWeight: '900',
  },

  name: {
    marginTop: 3,
    color: '#33434C',
    fontSize: 13,
    lineHeight: 18,
  },

  metaRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },

  meta: {
    color: '#6B7780',
    fontSize: 10.5,
  },

  blendPreview: {
    flex: 1,
    color: '#A4602D',
    fontSize: 10.5,
  },

  blendChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#FFF2E7',
  },

  blendChipText: {
    color: '#8A4F24',
    fontSize: 10.5,
    fontWeight: '700',
  },

  mainBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
    backgroundColor: '#E7F1EA',
  },

  mainBadgeText: {
    color: '#35704A',
    fontSize: 8.5,
    fontWeight: '900',
  },

  warningText: {
    marginTop: 7,
    color: '#9A6126',
    fontSize: 10,
    lineHeight: 14,
  },

  chevron: {
    marginLeft: 12,
    color: '#8B969D',
    fontSize: 28,
  },

  emptyContainer: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  emptyText: {
    color: '#6B7780',
    fontSize: 13,
    textAlign: 'center',
  },

  changeMainButton: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#24333D',
  },

  changeMainButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  inlineLoader: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#DCE2E6',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TwoStepYarnHelp;
