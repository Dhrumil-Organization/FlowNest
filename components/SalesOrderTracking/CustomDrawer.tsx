import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import {
  CustomDrawerProps,
  DesignData,
  ItemData,
  ItemStatus,
  WiseStatus,
} from './Modal';
import theme from '../../android/app/src/theme';

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
        design.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        design.DsnCode.toLowerCase().includes(searchQuery.toLowerCase()),
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
          design.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          design.DsnCode.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      const newDisplayed = filtered.slice(0, displayedDesigns.length + 10);
      setDisplayedDesigns(newDisplayed);
      setHasMore(newDisplayed.length < filtered.length);
      setIsLoadingMore(false);
    }, 1000); // Simulate network delay
  };
  const loadMoreParty = () => {
    if (isLoadingMoreParty || !hasMoreParty) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      const filtered = getPartyData.filter(
        party =>
          party.acccode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          party.accountname.toLowerCase().includes(searchQuery.toLowerCase()),
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
      prev.some(d => d.DsnCode === design.DsnCode)
        ? prev.filter(d => d.DsnCode !== design.DsnCode)
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
      const filtered = sexeData1.filter(
        se =>
          se.lngname.toLowerCase().includes(searchQuery.toLowerCase()) ||
          se.sexe.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      const newDisplayed = filtered.slice(0, displayedSexes.length + 10);
      setDisplayedExes(newDisplayed);
      setHasMoreExe(newDisplayed.length < filtered.length);
      setIsLoadingMore(false);
    }, 1000); // Simulate network delay
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.drawerContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <LinearGradient
            colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Scrollable Form Container */}
            <ScrollView
              style={styles.scrollableFormContainer}
              contentContainerStyle={styles.scrollableFormContent}
              nestedScrollEnabled={true}
            >
              {/* From Date */}
              {/* <View style={styles.inputGroup}>
                                <Text style={styles.label}>From Date</Text>
                                <TouchableOpacity style={styles.dateInput} onPress={() => setShowFromDatePicker(true)}>
                                    <Text style={styles.dateText}>{formatDate(fromDate)}</Text>
                                </TouchableOpacity>
                                {showFromDatePicker && (
                                    <DateTimePicker
                                        value={fromDate}
                                        mode="date"
                                        display="default"
                                        onChange={(event, date) => {
                                            setShowFromDatePicker(Platform.OS === 'ios');
                                            if (date) onFromDateChange(date);
                                        }}
                                    />
                                )}
                            </View>

                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>To Date</Text>
                                <TouchableOpacity style={styles.dateInput} onPress={() => setShowToDatePicker(true)}>
                                    <Text style={styles.dateText}>{formatDate(delDate)}</Text>
                                </TouchableOpacity>
                                {showToDatePicker && (
                                    <DateTimePicker
                                        value={delDate}
                                        mode="date"
                                        display="default"
                                        onChange={(event, date) => {
                                            setShowToDatePicker(Platform.OS === 'ios');
                                            if (date) onToDateChange(date);
                                        }}
                                    />
                                )}
                            </View> */}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Delivery Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowToDatePicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(delDate)}</Text>
                </TouchableOpacity>
                {showToDatePicker && (
                  <DateTimePicker
                    value={delDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowToDatePicker(Platform.OS === 'ios');
                      if (date) onToDateChange(date);
                    }}
                  />
                )}
              </View>

              {/* Financial Year Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Financial Year</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                >
                  <Text style={styles.dropdownText}>{selectedYear}</Text>
                </TouchableOpacity>
                {isYearDropdownOpen && (
                  <View style={styles.dropdownOptionsContainer}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                      {yearOptions.map(year => (
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.dropdownOption,
                            selectedYear === year && styles.selectedOption,
                          ]}
                          onPress={() => {
                            onYearChange(year);
                            setIsYearDropdownOpen(false);
                          }}
                        >
                          <Text style={styles.dropdownOptionText}>{year}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Sales Executive Dropdown */}
              {/* <View style={styles.inputGroup}>
                                <Text style={styles.label}>Sales Executive</Text>
                                <TouchableOpacity
                                    style={styles.dropdownButton}
                                    onPress={() => setIsExeDropdownOpen(!isExeDropdownOpen)}
                                >
                                    <Text style={styles.dropdownText}>{selectedExe}</Text>
                                </TouchableOpacity>
                                {isExeDropdownOpen && (
                                    <View style={styles.dropdownOptionsContainer}>
                                        <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                                            <TouchableOpacity
                                                style={styles.dropdownOption}
                                                onPress={() => {
                                                    onExeChange(null); // Send empty value
                                                    setIsExeDropdownOpen(false);
                                                }}
                                            >
                                                <Text style={styles.dropdownOptionText}>Select Executive</Text>
                                            </TouchableOpacity>
                                            {exeData.map((exe) => (
                                                <TouchableOpacity
                                                    key={exe.Code}
                                                    style={[
                                                        styles.dropdownOption,
                                                        selectedExe === exe.SalesExecutive && styles.selectedOption,
                                                    ]}
                                                    onPress={() => {
                                                        onExeChange(exe);
                                                        setIsExeDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text style={styles.dropdownOptionText}>{exe.SalesExecutive}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                            </View> */}





              {/* Accordion for Design Selection */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={toggleDesignAccordionParty}
              >
                <Text style={styles.accordionHeaderText}>
                  {isDesignAccordionOpenParty
                    ? `Hide Party: (${selectedParty.length})`
                    : `Select Party: (${selectedParty.length})`}
                </Text>
                <Icon
                  name={
                    isDesignAccordionOpenParty
                      ? 'keyboard-arrow-up'
                      : 'keyboard-arrow-down'
                  }
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>

              {isDesignAccordionOpenParty && (
                <>
                  {/* Search Bar */}
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search Party..."
                      placeholderTextColor="#ccc"
                      value={searchQueryParty}
                      onChangeText={setSearchQueryParty}
                    />
                    <Icon
                      name="search"
                      size={24}
                      color="#fff"
                      style={styles.searchIcon}
                    />
                  </View>
                  {/* Select All & Remove All Buttons */}
                  <View style={styles.selectAllContainer}>
                    <TouchableOpacity
                      style={styles.selectAllButton}
                      onPress={() => {
                        const filtered12 = getPartyData.filter(
                          party =>
                            party.acccode
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            party.accountname
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                        );
                        setSelectedParty(filtered12);
                      }}
                    >
                      <Text style={styles.selectAllButtonText}>Select All</Text>
                    </TouchableOpacity>
                    {selectedParty.length > 0 && (
                      <TouchableOpacity
                        style={styles.removeAllButton}
                        onPress={removeAllSelectedParty}
                      >
                        <Icon name="close" size={20} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Selected Items (Chips) */}
                  <ScrollView
                    horizontal
                    style={styles.selectedDesignsContainer}
                  >
                    {selectedParty.map(party => (
                      <View
                        key={party.DsnCode}
                        style={styles.selectedDesignChip}
                      >
                        <Text style={styles.selectedDesignText}>
                          {party.accountname} ({party.acccode})
                        </Text>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Design List (with Lazy Loading) */}
                  <ScrollView
                    ref={scrollViewRef}
                    style={styles.designListContainer}
                    contentContainerStyle={styles.designListContent}
                    nestedScrollEnabled={true} // Enable nested scrolling
                    onScroll={({ nativeEvent }) => {
                      const { layoutMeasurement, contentOffset, contentSize } =
                        nativeEvent;
                      const paddingToBottom = 20;
                      if (
                        layoutMeasurement.height + contentOffset.y >=
                        contentSize.height - paddingToBottom
                      ) {
                        loadMoreParty();
                      }
                    }}
                    scrollEventThrottle={16}
                  >
                    {displayedParty.map(party => (
                      <TouchableOpacity
                        key={party.acccode}
                        style={[
                          styles.designItem,
                          selectedParty.some(
                            d => d.acccode === party.acccode,
                          ) && styles.selectedDesignItem,
                        ]}
                        onPress={() => togglePartySelection(party)}
                      >
                        <Text style={styles.designName}>
                          {party.accountname}
                        </Text>
                        <Text style={styles.designCode}>{party.acccode}</Text>
                      </TouchableOpacity>
                    ))}
                    {isLoadingMoreParty && (
                      <ActivityIndicator
                        size="small"
                        color="#fff"
                        style={styles.loadingIndicator}
                      />
                    )}
                  </ScrollView>
                </>
              )}









              {/* Accordion for Design Selection */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={toggleDesignAccordion}
              >
                <Text style={styles.accordionHeaderText}>
                  {isDesignAccordionOpen
                    ? `Hide Items: (${selectedDesigns.length})`
                    : `Select Items: (${selectedDesigns.length})`}
                </Text>
                <Icon
                  name={
                    isDesignAccordionOpen
                      ? 'keyboard-arrow-up'
                      : 'keyboard-arrow-down'
                  }
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>

              {isDesignAccordionOpen && (
                <>
                  {/* Search Bar */}
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search Items..."
                      placeholderTextColor="#ccc"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    <Icon
                      name="search"
                      size={24}
                      color="#fff"
                      style={styles.searchIcon}
                    />
                  </View>
                  {/* Select All & Remove All Buttons */}
                  <View style={styles.selectAllContainer}>
                    <TouchableOpacity
                      style={styles.selectAllButton}
                      onPress={() => {
                        const filteredpar = getPartyData.filter(
                          party =>
                            party.accountname
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            party.acccode
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                        );
                        setSelectedParty(filteredpar);
                      }}
                    >
                      <Text style={styles.selectAllButtonText}>Select All</Text>
                    </TouchableOpacity>
                    {selectedDesigns.length > 0 && (
                      <TouchableOpacity
                        style={styles.removeAllButton}
                        onPress={removeAllSelectedParty}
                      >
                        <Icon name="close" size={20} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Selected Items (Chips) */}
                  <ScrollView
                    horizontal
                    style={styles.selectedDesignsContainer}
                  >
                    {selectedDesigns.map(design => (
                      <View
                        key={design.DsnCode}
                        style={styles.selectedDesignChip}
                      >
                        <Text style={styles.selectedDesignText}>
                          {design.DsnName} ({design.DsnCode})
                        </Text>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Design List (with Lazy Loading) */}
                  <ScrollView
                    ref={scrollViewRef}
                    style={styles.designListContainer}
                    contentContainerStyle={styles.designListContent}
                    nestedScrollEnabled={true} // Enable nested scrolling
                    onScroll={({ nativeEvent }) => {
                      const { layoutMeasurement, contentOffset, contentSize } =
                        nativeEvent;
                      const paddingToBottom = 20;
                      if (
                        layoutMeasurement.height + contentOffset.y >=
                        contentSize.height - paddingToBottom
                      ) {
                        loadMoreDesigns();
                      }
                    }}
                    scrollEventThrottle={16}
                  >
                    {displayedDesigns.map(design => (
                      <TouchableOpacity
                        key={design.DsnCode}
                        style={[
                          styles.designItem,
                          selectedDesigns.some(
                            d => d.DsnCode === design.DsnCode,
                          ) && styles.selectedDesignItem,
                        ]}
                        onPress={() => toggleDesignSelection(design)}
                      >
                        <Text style={styles.designName}>{design.DsnName}</Text>
                        <Text style={styles.designCode}>{design.DsnCode}</Text>
                      </TouchableOpacity>
                    ))}
                    {isLoadingMore && (
                      <ActivityIndicator
                        size="small"
                        color="#fff"
                        style={styles.loadingIndicator}
                      />
                    )}
                  </ScrollView>
                </>
              )}










              {/* Accordion for Slaes exe. Selection */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={toggleSalesExeAccordion}
              >
                <Text style={styles.accordionHeaderText}>
                  {isSalesExeAccordionOpen
                    ? `Hide Sales exe.: (${selectedSalesExes.length})`
                    : `Select Sales exe.: (${selectedSalesExes.length})`}
                </Text>
                <Icon
                  name={
                    isSalesExeAccordionOpen
                      ? 'keyboard-arrow-up'
                      : 'keyboard-arrow-down'
                  }
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>

              {isSalesExeAccordionOpen && (
                <>
                  {/* Search Bar */}
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search Sales exe...."
                      placeholderTextColor="#ccc"
                      value={searchQuerySexe}
                      onChangeText={setSearchQuerySexe}
                    />
                    <Icon
                      name="search"
                      size={24}
                      color="#fff"
                      style={styles.searchIcon}
                    />
                  </View>
                  {/* Select All & Remove All Buttons */}
                  <View style={styles.selectAllContainer}>
                    <TouchableOpacity
                      style={styles.selectAllButton}


                      onPress={() => {
                        const filteredpar = exeData.filter(
                          se =>
                            se.lngname
                              .toLowerCase()
                              .includes(searchQuerySexe.toLowerCase()) ||
                            se.sexe
                              .toLowerCase()
                              .includes(searchQuerySexe.toLowerCase()),
                        );
                        setSelectedSalesExes(filteredpar);
                      }}


                    >
                      <Text style={styles.selectAllButtonText}>Select All</Text>
                    </TouchableOpacity>
                    {selectedSalesExes.length > 0 && (
                      <TouchableOpacity
                        style={styles.removeAllButton}
                        onPress={removeAllSelectedSalesExes}
                      >
                        <Icon name="close" size={20} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Selected Items (Chips) */}
                  <ScrollView
                    horizontal
                    style={styles.selectedDesignsContainer}
                  >
                    {(selectedSalesExes || []).map(se => (
                      <View
                        key={se.sexe}
                        style={styles.selectedDesignChip}
                      >
                        <Text style={styles.selectedDesignText}>
                          {se.lngname} ({se.sexe})
                        </Text>
                      </View>
                    ))}
                    {/* {selectedSalesExes.map(se => (
                      <View
                        key={se.sexe}
                        style={styles.selectedDesignChip}
                      >
                        <Text style={styles.selectedDesignText}>
                          {se.lngname} ({se.sexe})
                        </Text>
                      </View>
                    ))} */}
                  </ScrollView>

                  {/* Design List (with Lazy Loading) */}
                  <ScrollView
                    ref={scrollViewRef}
                    style={styles.designListContainer}
                    contentContainerStyle={styles.designListContent}
                    nestedScrollEnabled={true} // Enable nested scrolling
                    onScroll={({ nativeEvent }) => {
                      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                      const paddingToBottom = 20;
                      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
                        loadMoreSexes();
                      }
                    }}
                    scrollEventThrottle={16}
                  >
                    {
                      displayedSexes.map(se => (
                        <TouchableOpacity
                          key={se.sexe}
                          style={[
                            styles.designItem,
                            selectedSalesExes.some(
                              d => d.sexe === se.sexe,
                            ) && styles.selectedDesignItem,
                          ]}
                          onPress={() => toggleSalesExeSelection(se)}
                        >
                          <Text style={styles.designName}>{se.lngname}</Text>
                          <Text style={styles.designCode}>{se.sexe}</Text>
                        </TouchableOpacity>
                      ))}
                    {isLoadingMore && (
                      <ActivityIndicator
                        size="small"
                        color="#fff"
                        style={styles.loadingIndicator}
                      />
                    )}
                  </ScrollView>
                </>
              )}

              <View style={styles.radioGroup}>
                {(['All', 'Open', 'Closed'] as ItemStatus[]).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={styles.radioButton}
                    onPress={() => handleStatusChange(status)}
                  >
                    <View style={styles.radioCircle}>
                      {localItemStatus === status && (
                        <View style={styles.radioInnerCircle} />
                      )}
                    </View>
                    <Text style={styles.radioLabel}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.radioGroup}>
                {(['Party Wise', 'Item Wise'] as WiseStatus[]).map(wise => (
                  <TouchableOpacity
                    key={wise}
                    style={styles.radioButton}
                    onPress={() => handleWiseChange(wise)}
                  >
                    <View style={styles.radioCircle}>
                      {localItemStatus1 === wise && (
                        <View style={styles.radioInnerCircle} />
                      )}
                    </View>
                    <Text style={styles.radioLabel}>{wise}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Load Button (Fixed at Bottom) */}
            <View style={styles.loadButtonContainer}>
              <TouchableOpacity
                style={styles.loadButton}
                onPress={handleLoadPress}
              >
                {isLoading ? (
                  <ActivityIndicator
                    size={24}
                    color={theme.BRAND_GRADIENT_START}
                  />
                ) : (
                  <Icon
                    name="refresh"
                    size={24}
                    color={theme.BRAND_GRADIENT_START}
                  />
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  gradientBackground: {
    flex: 1,
    padding: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  stepIndicator: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
    padding: 10,
  },
  inputGroup: {
    marginBottom: 15,
    zIndex: 10,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#fff',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dateText: {
    color: '#fff',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dropdownText: {
    color: '#fff',
  },
  dropdownOptionsContainer: {
    position: 'relative',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    maxHeight: 200,
  },
  dropdownOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownOptionText: {
    color: '#333',
  },
  selectedOption: {
    backgroundColor: '#e0e0e0',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    marginTop: 'auto',
  },
  navButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 5,
  },
  loadButton: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 5,
    alignItems: 'center',
    // flex: 1,
    padding: 10,
  },
  loadButtonText: {
    color: 'rgb(103, 9, 210)',
    fontSize: 16,
    fontWeight: 'bold',
  },
  //
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    color: '#fff',
  },
  searchIcon: {
    marginLeft: 10,
  },
  selectedDesignsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  selectedDesignChip: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 8,
    borderRadius: 12,
    marginRight: 5,
  },
  selectedDesignText: {
    color: '#fff',
    fontSize: 12,
  },

  designListContainer: {
    maxHeight: 300, // Fixed height for the design list
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    marginBottom: 10,
  },
  designListContent: {
    paddingBottom: 20,
  },
  designItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  selectedDesignItem: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  designName: {
    color: '#fff',
    fontSize: 14,
  },
  designCode: {
    color: '#ccc',
    fontSize: 12,
  },
  loadingIndicator: {
    padding: 10,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    marginBottom: 10,
  },
  accordionHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollableFormContainer: {
    flex: 1,
    padding: 10,
  },
  scrollableFormContent: {
    paddingBottom: 80, // Extra space for the Load button
  },
  loadButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  radioGroup: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  radioLabel: {
    color: '#fff',
    fontSize: 14,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectAllButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  selectAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  removeAllButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 8,
    borderRadius: 12,
  },
});

export default CustomDrawer;
