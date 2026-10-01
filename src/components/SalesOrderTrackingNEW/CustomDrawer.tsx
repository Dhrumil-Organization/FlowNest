import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Btn, DateField, SearchBox, Segment, Sheet } from './sotUi';
import {
  CustomDrawerProps,
  DesignData,
  ItemData,
  ItemStatus,
  WiseStatus,
} from './Modal';

const { height } = Dimensions.get('window');

const CustomDrawer: React.FC<CustomDrawerProps> = ({
  isVisible,
  onClose,
  fromDate,
  delDate,
  selectedYear,
  selectedExe,
  onFromDateChange,
  onToDateChange,
  onYearChange,
  onExeChange,
  onLoadPress,
  // onLoadPressItem,
  exeData,
  designData,
  getPartyData,
  isLoading,
  onDesignSelect,
  onItemSelectItem,
  onItemSelectParty,
  itemData,
  selectedItemStatus,
  selectedItemStatus1,
  onItemStatusChange,
  onItemStatusChange1,
  setSelectedDesigns,
  selectedDesigns,
  setSelectedItems,
  selectedItems,
  setSelectedParty,
  selectedParty,
  yearOptions,

  setSelectedSalesExes,
  selectedSalesExes,
  onSalesExeSelect,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [designData1, setdesignData11] = useState([]);
  const [sexeData1, setsexeData11] = useState([]);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isExeDropdownOpen, setIsExeDropdownOpen] = useState(false);
  //
  const [searchQuery, setSearchQuery] = useState('');
  // const [selectedDesigns, setSelectedDesigns] = useState<DesignData[]>([]);
  const [displayedDesigns, setDisplayedDesigns] = useState<DesignData[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isDesignAccordionOpen, setIsDesignAccordionOpen] = useState(false);
  const [isPartyAccordionOpen, setIsPartyAccordionOpen] = useState(false);
  //
  const [searchQueryItem, setSearchQueryItem] = useState('');
  const [searchQueryParty, setSearchQueryParty] = useState('');
  // const [selectedItems, setSelectedItems] = useState<ItemData[]>([]);
  const [displayedItems, setDisplayedItems] = useState<ItemData[]>([]);
  const [displayedParty, setDisplayedParty] = useState([]);
  const [isLoadingMoreItem, setIsLoadingMoreItem] = useState(false);
  const [isLoadingMoreParty, setIsLoadingMoreParty] = useState(false);
  const [hasMoreItem, setHasMoreItem] = useState(true);
  const [hasMoreParty, setHasMoreParty] = useState(true);
  const scrollViewRefItem = useRef<ScrollView>(null);
  const [isDesignAccordionOpenItem, setIsDesignAccordionOpenItem] =
    useState(false);
  const [isDesignAccordionOpenParty, setIsDesignAccordionOpenparty] =
    useState(false);
  const [localItemStatus, setLocalItemStatus] = useState<ItemStatus>(
    selectedItemStatus || 'All',
  );
  const [localItemStatus1, setLocalItemStatus1] = useState<WiseStatus>(
    selectedItemStatus1 || 'Party Wise',
  );

  const [step, setStep] = useState(1);

  const [isSalesExeAccordionOpen, setIsSalesExeAccordionOpen] = useState(false);
  const [isSalesExeAccordionOpenItem, setIsSalesExeAccordionOpenItem] =
    useState(false);
  const [isSalesExeAccordionOpenParty, setIsSalesExeAccordionOpenparty] =
    useState(false);

  const [hasMoreExe, setHasMoreExe] = useState(true);
  const [displayedSexes, setDisplayedExes] = useState([]);
  const [searchQuerySexe, setSearchQuerySexe] = useState('');

  console.log("exeData :", exeData)

  // const yearOptions = ['2022-2023', '2023-2024', '2024-2025', '2025-2026', '2026-2027'];

  useEffect(() => {
    if (exeData.length > 0 && !selectedExe) {
      onExeChange(exeData[0]);
    }
  }, [exeData, selectedExe, onExeChange]);

  useEffect(() => {
    if (designData) {
      setdesignData11(designData as any);
    }
  }, [designData]);

  useEffect(() => {
    if (exeData) {
      setsexeData11(exeData as any);
    }
  }, [exeData]);

  console.log('designData1:', designData1, 'itemData:', itemData, sexeData1);

  // useEffect(() => {
  //     const filtered = designData1.filter(
  //         (design) =>
  //             design.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //             design.DsnCode.toLowerCase().includes(searchQuery.toLowerCase())
  //     );
  //     const filtereditem = itemData.filter(
  //         (item) =>
  //             item.ItmName.toLowerCase().includes(searchQueryItem.toLowerCase()) ||
  //             item.ItmCode.toLowerCase().includes(searchQueryItem.toLowerCase())
  //     );
  //     const filteredparty = getPartyData.filter(
  //         (party) =>
  //             party.acccode.toLowerCase().includes(searchQueryParty.toLowerCase()) ||
  //             party.accountname.toLowerCase().includes(searchQueryParty.toLowerCase())
  //     );
  //     setDisplayedDesigns(filtered.slice(0, 10));
  //     setDisplayedItems(filtereditem.slice(0, 10));
  //     setDisplayedParty(filteredparty.slice(0, 10));
  //     setHasMore(filtered.length > 10);
  //     setHasMoreItem(filtereditem.length > 10);
  //     setHasMoreParty(filteredparty.length > 10);

  useEffect(() => {
    const filtered = designData1.filter(
      design =>
        design.ItmName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        design.ItmCode.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    const filtereditem = itemData.filter(
      item =>
        item.ItmName.toLowerCase().includes(searchQueryItem.toLowerCase()) ||
        item.ItmCode.toLowerCase().includes(searchQueryItem.toLowerCase()),
    );
    const filteredparty = getPartyData.filter(
      party =>
        party.acccode.toLowerCase().includes(searchQueryParty.toLowerCase()) ||
        party.accountname
          .toLowerCase()
          .includes(searchQueryParty.toLowerCase()),
    );

    // const filteredsexe = sexeData1.filter(
    //   se =>
    //     se.lngname.toLowerCase().includes(searchQuerySexe.toLowerCase()) ||
    //     se.sese.toLowerCase().includes(searchQuerySexe.toLowerCase()),
    // );

    const filteredsexe = sexeData1.filter(
      se =>
        se.lngname?.toLowerCase().includes(searchQuerySexe.toLowerCase()) ||
        se.sexe?.toLowerCase().includes(searchQuerySexe.toLowerCase()),
    );

    setDisplayedDesigns(filtered.slice(0, 10));
    setDisplayedItems(filtereditem.slice(0, 10));
    setDisplayedParty(filteredparty.slice(0, 10));
    setDisplayedExes(filteredsexe.slice(0, 10));
    setHasMore(filtered.length > 10);
    setHasMoreItem(filtereditem.length > 10);
    setHasMoreParty(filteredparty.length > 10);
    setHasMoreExe(filteredsexe.length > 10);
  }, [
    searchQuery,
    designData1,
    searchQueryItem,
    itemData,
    getPartyData,
    searchQueryParty,
    sexeData1,
    searchQuerySexe
  ]);

  // useEffect(() => {
  //     const filtered = getPartyData.filter(
  //         (party) =>
  //             party.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //             party.DsnCode.toLowerCase().includes(searchQuery.toLowerCase())
  //     );
  //     const filtereditem = itemData.filter(
  //         (item) =>
  //             item.ItmName.toLowerCase().includes(searchQueryItem.toLowerCase()) ||
  //             item.ItmCode.toLowerCase().includes(searchQueryItem.toLowerCase())
  //     );
  //     setDisplayedDesigns(filtered.slice(0, 10));
  //     setDisplayedItems(filtereditem.slice(0, 10));
  //     setHasMore(filtered.length > 10);
  //     setHasMoreItem(filtereditem.length > 10);
  // }, [searchQuery, getPartyData, searchQueryItem, itemData]);

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : height,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  useEffect(() => {
    setLocalItemStatus(selectedItemStatus);
  }, [selectedItemStatus]);

  useEffect(() => {
    setLocalItemStatus1(selectedItemStatus1);
  }, [selectedItemStatus1]);

  // Handle radio selection
  const handleStatusChange = (status: ItemStatus) => {
    setLocalItemStatus(status);
    onItemStatusChange(status);
  };

  const handleWiseChange = (wise: WiseStatus) => {
    setLocalItemStatus1(wise);
    onItemStatusChange1(wise);
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  // Filter and paginate designs based on search query
  // useEffect(() => {
  //     const filtered = designData1.filter(
  //         (design) =>
  //             design.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //             design.DsnCode.toLowerCase().includes(searchQuery.toLowerCase())
  //     );
  //     setDisplayedDesigns(filtered.slice(0, 10));
  //     setHasMore(filtered.length > 10);
  // }, [searchQuery, designData1]);

  // Load more designs on scroll
  const loadMoreDesigns = () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      const filtered = designData1.filter(
        design =>
          design?.ItmName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          design?.ItmCode?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      const newDisplayed = filtered.slice(0, displayedDesigns.length + 10);
      setDisplayedDesigns(newDisplayed);
      setHasMore(newDisplayed.length < filtered.length);
      setIsLoadingMore(false);
    }, 1000); // Simulate network delay
  };
  const loadMoreParty = () => {
    if (isLoadingMoreParty || !hasMoreParty) return;

    // FIX: use the party search + party loader (was using the item search
    // text and left the item loader stuck "on").
    setIsLoadingMoreParty(true);
    setTimeout(() => {
      const filtered = getPartyData.filter(
        party =>
          party?.acccode?.toLowerCase().includes(searchQueryParty.toLowerCase()) ||
          party?.accountname?.toLowerCase().includes(searchQueryParty.toLowerCase()),
      );
      const newDisplayed = filtered.slice(0, displayedParty.length + 10);
      setDisplayedParty(newDisplayed);
      setHasMoreParty(newDisplayed.length < filtered.length);
      setIsLoadingMoreParty(false);
    }, 1000); // Simulate network delay
  };

  const loadMoreItems = () => {
    if (isLoadingMoreItem || !hasMoreItem) return;

    setIsLoadingMoreItem(true);
    setTimeout(() => {
      const filtered = itemData.filter(
        item =>
          item.ItmName.toLowerCase().includes(searchQueryItem.toLowerCase()) ||
          item.ItmCode.toLowerCase().includes(searchQueryItem.toLowerCase()),
      );
      const newDisplayed = filtered.slice(0, displayedItems.length + 10);
      setDisplayedItems(newDisplayed);
      setHasMoreItem(newDisplayed.length < filtered.length);
      setIsLoadingMoreItem(false);
    }, 1000); // Simulate network delay
  };




  // Toggle design selection
  const toggleDesignSelection = (design: DesignData) => {
    setSelectedDesigns(prev =>
      prev.some(d => d.ItmCode === design.ItmCode)
        ? prev.filter(d => d.ItmCode !== design.ItmCode)
        : [...prev, design],
    );
  };

  const toggleItemSelection = (item: ItemData) => {
    setSelectedItems(prev =>
      prev.some(i => i.ItmCode === item.ItmCode)
        ? prev.filter(i => i.ItmCode !== item.ItmCode)
        : [...prev, item],
    );
  };

  const togglePartySelection = party => {
    setSelectedParty(prev =>
      prev.some(i => i.acccode === party.acccode)
        ? prev.filter(i => i.acccode !== party.acccode)
        : [...prev, party],
    );
  };

  // Toggle accordion
  const toggleDesignAccordion = () => {
    setIsDesignAccordionOpen(!isDesignAccordionOpen);
  };
  const toggleDesignAccordionItem = () => {
    setIsDesignAccordionOpenItem(!isDesignAccordionOpenItem);
  };
  const toggleDesignAccordionParty = () => {
    setIsDesignAccordionOpenparty(!isDesignAccordionOpenParty);
  };



  // Remove all selected designs
  const removeAllSelected = () => {
    setSelectedDesigns([]);
  };
  const removeAllSelectedParty = () => {
    setSelectedParty([]);
  };

  const removeAllSelectedItems = () => {
    setSelectedItems([]);
  };

  const handleLoadPress = () => {
    onLoadPress();
    onDesignSelect(selectedDesigns); // Pass selected designs to parent.
    onItemSelectItem(selectedItems);
    onItemSelectParty(selectedParty);

    onSalesExeSelect(selectedSalesExes)
  };

  const formatDate = (rawDate: any) => {
    let day = rawDate.getDate().toString().padStart(2, '0') || '';
    let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
    let year = rawDate.getFullYear() || '';
    return `${day}-${month}-${year}`;
  };

  const toggleSalesExeAccordion = () => {

    console.log("dsdsdsd", isSalesExeAccordionOpen)
    setIsSalesExeAccordionOpen(!isSalesExeAccordionOpen);
  };
  const toggleSalesExeAccordionItem = () => {
    setIsSalesExeAccordionOpenItem(!isSalesExeAccordionOpenItem);
  };
  const toggleSalesExeAccordionParty = () => {
    setIsSalesExeAccordionOpenparty(!isSalesExeAccordionOpenParty);
  };

  // const toggleSalesExeSelection = (temp) => {
  //   console.log("temp :", temp)

  //   // setSelectedDesigns(prev =>
  //   //   prev.some(d => d.DsnCode === design.DsnCode)
  //   //     ? prev.filter(d => d.DsnCode !== design.DsnCode)
  //   //     : [...prev, design],
  //   // );
  // };
  const toggleSalesExeSelection = (se) => {
    setSelectedSalesExes(prev =>
      prev.some(i => i.sexe === se.sexe)
        ? prev.filter(i => i.sexe !== se.sexe)
        : [...prev, se],
    );
  };

  const removeAllSelectedSalesExes = () => {
    setSelectedSalesExes([]);
  };


  const loadMoreSexes = () => {

    console.log("aaaaaaaaaaaaa")
    if (isLoadingMore || !hasMoreExe) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      // FIX: filter by the sales-exe search text (was the item search text).
      const filtered = sexeData1.filter(
        se =>
          se?.lngname?.toLowerCase().includes(searchQuerySexe.toLowerCase()) ||
          se?.sexe?.toLowerCase().includes(searchQuerySexe.toLowerCase()),
      );
      const newDisplayed = filtered.slice(0, displayedSexes.length + 10);
      setDisplayedExes(newDisplayed);
      setHasMoreExe(newDisplayed.length < filtered.length);
      setIsLoadingMore(false);
    }, 1000); // Simulate network delay
  };

  // Fires the original "load more" handler when a list is scrolled near its end.
  const nearEnd = (fn: () => void) => ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 20;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      fn();
    }
  };

  return (
    <Sheet
      open={isVisible}
      onClose={onClose}
      eyebrow="SALES ORDER TRACKING"
      title="Filters"
      side
      wideMax={460}
      footer={
        <>
          <Btn label="Cancel" kind="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Btn
            label={isLoading ? 'Loading…' : 'Load'}
            icon="refresh"
            onPress={handleLoadPress}
            loading={isLoading}
            style={{ flex: 2 }}
          />
        </>
      }
    >
      {/* Delivery date + financial year */}
      <View style={styles.group}>
        <Text style={styles.label}>Delivery Date</Text>
        <DateField value={delDate} onChange={onToDateChange} />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>Financial Year</Text>
        <View style={styles.yearWrap}>
          {yearOptions.map(year => {
            const on = selectedYear === year;
            return (
              <TouchableOpacity
                key={year}
                style={[styles.yearChip, on && styles.yearChipOn]}
                onPress={() => {
                  onYearChange(year);
                  setIsYearDropdownOpen(false);
                }}
                accessibilityState={{ selected: on }}
              >
                {on ? <Icon name="check" size={14} color="#fff" /> : null}
                <Text style={[styles.yearChipText, on && { color: '#fff' }]}>{year}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Segment
        label="View"
        value={localItemStatus1 as any}
        options={[
          { value: 'Party Wise', label: 'Party Wise', icon: 'groups' },
          { value: 'Design Wise', label: 'Design Wise', icon: 'style' },
        ]}
        onChange={(wise: any) => handleWiseChange(wise)}
      />

      <Segment
        label="Order Status"
        value={localItemStatus}
        options={[
          { value: 'All', label: 'All' },
          { value: 'Open', label: 'Open' },
          { value: 'Closed', label: 'Closed' },
        ]}
        onChange={(status: ItemStatus) => handleStatusChange(status)}
      />

      {/* Party */}
      <MultiSection
        title="Party"
        icon="person"
        open={isDesignAccordionOpenParty}
        onToggle={toggleDesignAccordionParty}
        count={selectedParty.length}
        search={searchQueryParty}
        onSearch={setSearchQueryParty}
        searchPlaceholder="Search party name or code…"
        onSelectAll={() => {
          // FIX: "Select All" now follows the party search box.
          const filtered12 = getPartyData.filter(
            party =>
              party?.acccode
                ?.toLowerCase()
                .includes(searchQueryParty.toLowerCase()) ||
              party?.accountname
                ?.toLowerCase()
                .includes(searchQueryParty.toLowerCase()),
          );
          setSelectedParty(filtered12);
        }}
        onClear={removeAllSelectedParty}
        selected={selectedParty.map((party: any) => ({
          key: String(party.acccode),
          label: party.accountname,
          code: party.acccode,
          onRemove: () => togglePartySelection(party),
        }))}
        options={displayedParty.map((party: any) => ({
          key: String(party.acccode),
          label: party.accountname,
          code: party.acccode,
          on: selectedParty.some(d => d.acccode === party.acccode),
          onPress: () => togglePartySelection(party),
        }))}
        onScroll={nearEnd(loadMoreParty)}
        loadingMore={isLoadingMoreParty}
        hasMore={hasMoreParty}
        onLoadMore={loadMoreParty}
      />

      {/* Items */}
      <MultiSection
        title="Items"
        icon="category"
        open={isDesignAccordionOpen}
        onToggle={toggleDesignAccordion}
        count={selectedDesigns.length}
        search={searchQuery}
        onSearch={setSearchQuery}
        searchPlaceholder="Search item name or code…"
        onSelectAll={() => {
          const filteredpar = designData.filter(
            party =>
              party?.ItmName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              party?.ItmCode?.toLowerCase().includes(searchQuery.toLowerCase()),
          );
          setSelectedDesigns(filteredpar);
        }}
        onClear={removeAllSelected}
        selected={selectedDesigns.map(design => ({
          key: String(design.ItmCode),
          label: design.ItmName,
          code: design.ItmCode,
          onRemove: () => toggleDesignSelection(design),
        }))}
        options={displayedDesigns.map(design => ({
          key: String(design.ItmCode),
          label: design.ItmName,
          code: design.ItmCode,
          on: selectedDesigns.some(d => d.ItmCode === design.ItmCode),
          onPress: () => toggleDesignSelection(design),
        }))}
        onScroll={nearEnd(loadMoreDesigns)}
        loadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={loadMoreDesigns}
      />

      {/* Sales executive */}
      <MultiSection
        title="Sales Executive"
        icon="badge"
        open={isSalesExeAccordionOpen}
        onToggle={toggleSalesExeAccordion}
        count={(selectedSalesExes || []).length}
        search={searchQuerySexe}
        onSearch={setSearchQuerySexe}
        searchPlaceholder="Search sales executive…"
        onSelectAll={() => {
          const filteredpar = exeData.filter(
            (se: any) =>
              se?.lngname
                ?.toLowerCase()
                .includes(searchQuerySexe.toLowerCase()) ||
              se?.sexe
                ?.toLowerCase()
                .includes(searchQuerySexe.toLowerCase()),
          );
          setSelectedSalesExes(filteredpar);
        }}
        onClear={removeAllSelectedSalesExes}
        selected={(selectedSalesExes || []).map((se: any) => ({
          key: String(se.sexe),
          label: se.lngname,
          code: se.sexe,
          onRemove: () => toggleSalesExeSelection(se),
        }))}
        options={displayedSexes.map((se: any) => ({
          key: String(se.sexe),
          label: se.lngname,
          code: se.sexe,
          on: selectedSalesExes.some(d => d.sexe === se.sexe),
          onPress: () => toggleSalesExeSelection(se),
        }))}
        onScroll={nearEnd(loadMoreSexes)}
        loadingMore={isLoadingMore}
        hasMore={hasMoreExe}
        onLoadMore={loadMoreSexes}
      />
    </Sheet>
  );
};

/* ---------------------------------------------------------------------- */
/* Collapsible multi-select used for Party / Items / Sales executive        */
/* ---------------------------------------------------------------------- */

type MultiOpt = { key: string; label: string; code?: string; on: boolean; onPress: () => void };
type MultiSel = { key: string; label: string; code?: string; onRemove: () => void };

function MultiSection({
  title,
  icon,
  open,
  onToggle,
  count,
  search,
  onSearch,
  searchPlaceholder,
  onSelectAll,
  onClear,
  selected,
  options,
  onScroll,
  loadingMore,
  hasMore,
  onLoadMore,
}: {
  title: string;
  icon: string;
  open: boolean;
  onToggle: () => void;
  count: number;
  search: string;
  onSearch: (t: string) => void;
  searchPlaceholder: string;
  onSelectAll: () => void;
  onClear: () => void;
  selected: MultiSel[];
  options: MultiOpt[];
  onScroll: (e: any) => void;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <View style={[styles.multi, open && styles.multiOpen]}>
      <TouchableOpacity style={styles.multiHead} onPress={onToggle} accessibilityRole="button">
        <View style={styles.multiIcon}>
          <Icon name={icon as any} size={17} color={T.copper} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.multiTitle}>{title}</Text>
          <Text style={styles.multiSub} numberOfLines={1}>
            {count > 0
              ? selected.slice(0, 2).map(s => s.label).join(', ') + (count > 2 ? ` +${count - 2} more` : '')
              : 'All (no filter)'}
          </Text>
        </View>
        {count > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{count}</Text>
          </View>
        ) : null}
        <Icon name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color={T.muted} />
      </TouchableOpacity>

      {open && (
        <View style={styles.multiBody}>
          <SearchBox value={search} onChangeText={onSearch} placeholder={searchPlaceholder} />

          <View style={styles.multiActions}>
            <TouchableOpacity style={styles.linkBtn} onPress={onSelectAll}>
              <Icon name="done-all" size={15} color={T.blue} />
              <Text style={styles.linkBtnText}>Select all</Text>
            </TouchableOpacity>
            {count > 0 ? (
              <TouchableOpacity style={styles.linkBtn} onPress={onClear}>
                <Icon name="clear-all" size={15} color={T.red} />
                <Text style={[styles.linkBtnText, { color: T.red }]}>Clear ({count})</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {selected.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selRow}>
              {selected.map((s, i) => (
                <TouchableOpacity key={`${s.key}-${i}`} style={styles.selChip} onPress={s.onRemove}>
                  <Text style={styles.selChipText} numberOfLines={1}>
                    {s.label}
                    {s.code ? ` (${s.code})` : ''}
                  </Text>
                  <Icon name="close" size={13} color="#fff" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          <ScrollView
            style={styles.optList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {options.map((o, i) => (
              <TouchableOpacity
                key={`${o.key}-${i}`}
                style={[styles.optRow, o.on && styles.optRowOn]}
                onPress={o.onPress}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: o.on }}
              >
                <Icon
                  name={o.on ? 'check-box' : 'check-box-outline-blank'}
                  size={20}
                  color={o.on ? T.nav : T.muted}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.optLabel} numberOfLines={1}>{o.label}</Text>
                  {o.code ? <Text style={styles.optCode} numberOfLines={1}>{o.code}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
            {!options.length ? <Text style={styles.noOpt}>No matches</Text> : null}
            {loadingMore ? (
              <ActivityIndicator size="small" color={T.copper} style={{ marginVertical: 10 }} />
            ) : hasMore ? (
              <TouchableOpacity style={styles.moreBtn} onPress={onLoadMore}>
                <Text style={styles.moreBtnText}>Show more</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },

  yearWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  yearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  yearChipOn: { backgroundColor: T.nav, borderColor: T.nav },
  yearChipText: { fontSize: 12.5, fontWeight: '700', color: T.nav },

  multi: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    backgroundColor: T.surface,
    overflow: 'hidden',
  },
  multiOpen: { borderColor: `${T.nav}55` },
  multiHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  multiIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${T.copper}14`,
  },
  multiTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
  multiSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.copper,
  },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  multiBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: T.hair,
    paddingTop: 12,
    backgroundColor: T.sub,
  },
  multiActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  linkBtnText: { fontSize: 12.5, fontWeight: '800', color: T.blue },
  selRow: { gap: 6 },
  selChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: T.nav,
    maxWidth: 240,
  },
  selChipText: { fontSize: 11.5, fontWeight: '700', color: '#fff', flexShrink: 1 },
  optList: {
    maxHeight: 260,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  optRowOn: { backgroundColor: `${T.nav}0D` },
  optLabel: { fontSize: 13.5, fontWeight: '700', color: T.ink },
  optCode: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  noOpt: { textAlign: 'center', color: T.muted, fontSize: 12.5, paddingVertical: 16 },
  moreBtn: { alignItems: 'center', paddingVertical: 10 },
  moreBtnText: { fontSize: 12.5, fontWeight: '800', color: T.copper },
});

export default CustomDrawer;
