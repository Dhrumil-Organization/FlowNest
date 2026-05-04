import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import {
  normalizePrptype,
  saveLargeData,
  readPrptypeCache,
  fetchPropertyData,
  getCurrentFinancialYearMain,
  generateFinancialYearOptions,
  fetchAllYeardata,
  fetchAllStoredata,
} from '../../common/API/Functions';

const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={[styles.avatar, { backgroundColor: '#ddd' }]} />
    <View style={{ flex: 1 }}>
      <View style={styles.skelLineShort} />
      <View style={styles.skelLineLong} />
      <View style={styles.skelLineMid} />
    </View>
  </View>
);
const ProductionReport = ({ navigation, token }) => {
  const [search, setSearch] = useState('');
  const [partyData, setPartyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [yearOptions, setYearOptions] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [propertyData, setPropertyData] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [propertySearch, setPropertySearch] = useState('');
  const [recentProps, setRecentProps] = useState([]);
  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
  const [getAllYearData, setAllYearData] = useState([]);
  const [getAllStoreData, setAllStoreData] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');

  const getToken = () => token;

  useEffect(() => {
    console.log('selectedProperty :', selectedProperty);
    if (
      typeof selectedProperty != 'undefined' &&
      selectedProperty != null &&
      selectedProperty != '' &&
      Object.keys(selectedProperty).length > 0
    ) {
      const testFunc = async () => {
        const allyeardata = await fetchAllYeardata(
          token,
          selectedProperty.PrpCode,
        );

        setAllYearData(allyeardata);
        setYearOptions(allyeardata);
        setSelectedYear(allyeardata[0].YearName);
        console.log('allyeardata[0].YearName :', allyeardata[0].YearName);
      };

      testFunc();
    }
  }, [selectedProperty]);

  useEffect(() => {
    console.log('selectedProperty :', selectedProperty);
    if (
      typeof selectedProperty != 'undefined' &&
      selectedProperty != null &&
      selectedProperty != '' &&
      Object.keys(selectedProperty).length > 0 &&
      typeof selectedYear != 'undefined' &&
      selectedYear != null &&
      selectedYear != ''
    ) {
      const testFuncyear = async () => {
        const yearno = selectedYear?.slice(-2);
        console.log('yearno ==>', yearno);
        const allstoredata = await fetchAllStoredata(
          token,
          selectedProperty.PrpCode,
          yearno,
        );

        console.log('allstoredata ------>', allstoredata);
        setAllStoreData(allstoredata);
        setSelectedStore(allstoredata[0].StrCode);
      };

      testFuncyear();
    }
  }, [selectedYear]);

  //console.log("getAllYearData --->", getAllYearData)

  // YEAR
  // useEffect(() => {
  //   const y = new Date().getFullYear();
  //   const arr = [];
  //   for (let i = 0; i < 5; i++) {
  //     arr.push(`${y - i}-${y - i + 1}`);
  //   }
  //   console.log("arr --->", arr)
  //   setYearOptions(arr);
  //   setSelectedYear(arr[0]);
  // }, []);

  // PROPERTY
  useEffect(() => {
    const load = async () => {
      const data = await fetchPropertyData(token);
      console.log('data :', data);
      setPropertyData(data || []);
      if (data?.length) setSelectedProperty(data[0]);
    };
    load();
  }, []);

  // SELECT PROPERTY
  const selectProperty = item => {
    setSelectedProperty(item);

    const updated = [
      item,
      ...recentProps.filter(p => p.PrpCode !== item.PrpCode),
    ];
    setRecentProps(updated.slice(0, 3));
  };

  const filteredData = partyData.filter(i =>
    i.accname?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FB' }}>
      {/* HEADER */}
      <LinearGradient colors={['#0F6C7B', '#13879A']} style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-back-ios-new" size={18} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Production report</Text>

        <TouchableOpacity onPress={() => setFilterVisible(true)}>
          <Icon name="tune" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={filteredData}
        keyExtractor={(i, index) => index.toString()}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const scale = new Animated.Value(1);

          const onPressIn = () => {
            Animated.spring(scale, {
              toValue: 0.96,
              useNativeDriver: true,
            }).start();
          };

          const onPressOut = () => {
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
            }).start();
          };

          const fullAddress = [
            item.Address,
            item.City,
            item.State,
            item.Cnty,
            item.Zip,
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <AnimatedTouchable
              style={[styles.card, { transform: [{ scale }] }]}
              activeOpacity={0.9}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={() =>
                navigation.navigate('PartyDetailScreen', {
                  party: item,
                  token: token,
                  selectedProperty: selectedProperty, // ✅ ADD THIS
                  selectedYear: selectedYear, // ✅ ADD THIS
                })
              }
            >
              {/* AVATAR */}
              <LinearGradient
                colors={['#0F2027', '#2C5364']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {item.accountname?.charAt(0)}
                </Text>
              </LinearGradient>

              {/* CONTENT */}
              <View style={{ flex: 1 }}>
                {/* TOP ROW */}
                <View style={styles.topRow}>
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeText}>{item.acccode}</Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Active</Text>
                  </View>
                </View>

                {/* NAME */}
                <Text style={styles.name}>{item.accountname}</Text>

                {/* ADDRESS */}
                <Text style={styles.address}>
                  {fullAddress || 'No address available'}
                </Text>

                {/* 🔥 EXTRA INFO */}
                <View style={styles.extraRow}>
                  <Text style={styles.extraText}>
                    💰 Limit: {parseFloat(item.crlimit).toFixed(2) || '0'}
                  </Text>

                  <Text style={styles.extraText}>👤 {item.conname || '-'}</Text>

                  <Text style={styles.extraText}>📞 {item.contel || '-'}</Text>
                </View>
              </View>
            </AnimatedTouchable>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <SkeletonCard key={i} />
              ))}
            </>
          ) : (
            <Text style={{ textAlign: 'center', marginTop: 20 }}>
              No data found
            </Text>
          )
        }
      />

      {/* FILTER MODAL */}
      <Modal transparent visible={filterVisible} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.title}></Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Icon name="close" size={15} style={{ color: '#000' }} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Property</Text>
            <TouchableOpacity
              style={styles.inputBox}
              onPress={() => setPropertyPickerVisible(true)}
            >
              <Text numberOfLines={1} style={{ color: '#000' }}>
                {selectedProperty?.LngName || 'Select property'}
              </Text>
              <Icon name="keyboard-arrow-down" size={24} />
            </TouchableOpacity>

            <Text style={styles.label}>Year</Text>
            <TouchableOpacity
              style={styles.bigInput}
              onPress={() => setYearPickerVisible(true)}
            >
              <Text style={styles.inputText}>
                {selectedYear || 'Select Year'}
              </Text>

              <Icon name="keyboard-arrow-down" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={yearPickerVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* HEADER */}
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setYearPickerVisible(false)}>
              <Icon name="arrow-back-ios" size={20} color="#000" />
            </TouchableOpacity>

            <Text style={styles.pickerTitle}>Select Year</Text>
            <View style={{ width: 20 }} />
          </View>

          {/* LIST */}
          <FlatList
            data={yearOptions}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  setSelectedYear(item.YearName);
                  setYearPickerVisible(false);
                }}
              >
                <Text style={{ color: '#000' }}>{item.YearName}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* PROPERTY PICKER */}
      <Modal visible={propertyPickerVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setPropertyPickerVisible(false)}>
              <Icon name="arrow-back-ios" size={20} style={{ color: '#000' }} />
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Select Property</Text>
            <View style={{ width: 20 }} />
          </View>

          <View style={styles.pickerSearch}>
            <Icon name="search" size={18} color="#777" />
            <TextInput
              placeholder="Search property..."
              placeholderTextColor="#000"
              value={propertySearch}
              onChangeText={setPropertySearch}
              style={{ flex: 1, color: '#000' }}
            />
          </View>

          {/* RECENT */}
          {selectedProperty && (
            <>
              <Text style={styles.section}>Selected</Text>

              <View style={styles.selectedBox}>
                <Text style={styles.selectedText}>
                  {selectedProperty.LngName}
                </Text>

                <Icon name="check-circle" size={18} color="#0F6C7B" />
              </View>
            </>
          )}

          <FlatList
            data={propertyData.filter(p =>
              p.LngName.toLowerCase().includes(propertySearch.toLowerCase()),
            )}
            keyExtractor={item => item.PrpCode}
            renderItem={({ item }) => {
              const selected = selectedProperty?.PrpCode === item.PrpCode;
              return (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    selectProperty(item);
                    setPropertyPickerVisible(false);
                  }}
                >
                  <Text style={{ flex: 1, color: '#000' }}>{item.LngName}</Text>
                  {selected && (
                    <Icon name="check-circle" size={20} color="#0F6C7B" />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
};

export default ProductionReport;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // ✅ FIX alignment
    paddingHorizontal: 16,
    paddingVertical: 18,
    paddingTop: 40, // ✅ status bar spacing
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center', // ✅ FIX vertical alignment
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 10, // ✅ floating effect like modern apps
    paddingHorizontal: 12,
    height: 48, // ✅ FIX height
    borderRadius: 14,
    elevation: 4,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },

  badge: {
    backgroundColor: '#E8F5E9',
    padding: 5,
    borderRadius: 10,
    marginTop: 5,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },

  sheet: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: { fontSize: 14, color: '#6e6e6e' },
  label: { marginTop: 10, color: '#6e6e6e' },

  yearRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },

  yearChip: {
    padding: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
    margin: 4,
  },

  yearSelected: {
    backgroundColor: '#0F6C7B',
  },

  inputBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: 5,
  },

  applyBtn: {
    backgroundColor: '#0F2027',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center',
  },

  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },

  pickerTitle: { fontSize: 16, fontWeight: '600', color: '#000' },

  // pickerSearch: {
  //   flexDirection: "row",
  //   backgroundColor: "#f1f1f1",
  //   margin: 10,
  //   padding: 10,
  //   borderRadius: 10
  // },

  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center', // 🔥 THIS FIX
    backgroundColor: '#f1f1f1',
    margin: 10,
    paddingHorizontal: 10,
    height: 45, // 🔥 optional but recommended
    borderRadius: 10,
  },

  pickerItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },

  section: {
    marginLeft: 15,
    marginTop: 10,
    fontWeight: '600',
    color: '#000',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0F2027',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },

  code: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },

  address: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    lineHeight: 16,
  },

  limitBox: {
    marginTop: 8,
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },

  limitText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 10,
    marginVertical: 8,
  },

  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F6C7B',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  codeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  codeText: {
    color: '#1565C0',
    fontSize: 12,
    fontWeight: '600',
  },

  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  statusText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '600',
  },

  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  icon: {
    marginRight: 4,
  },

  address: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    lineHeight: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  codeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  codeText: {
    color: '#1565C0',
    fontSize: 12,
    fontWeight: '600',
  },

  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },

  statusText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '600',
  },

  arrow: {
    fontSize: 22,
    color: '#999',
  },

  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginTop: 4,
  },

  address: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    lineHeight: 16,
  },
  extraRow: {
    marginTop: 8,
  },

  extraText: {
    fontSize: 12,
    color: '#444',
    marginTop: 2,
  },

  // skeleton styles
  skelLineShort: {
    height: 12,
    backgroundColor: '#eee',
    width: '40%',
    marginBottom: 6,
    borderRadius: 6,
  },

  skelLineLong: {
    height: 14,
    backgroundColor: '#eee',
    width: '80%',
    marginBottom: 6,
    borderRadius: 6,
  },

  skelLineMid: {
    height: 12,
    backgroundColor: '#eee',
    width: '60%',
    borderRadius: 6,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 5,
  },

  filterBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    marginRight: 8,
    elevation: 2,
  },

  filterLabel: {
    fontSize: 11,
    color: '#888',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  filterValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F2027',
    flex: 1, // 🔥 IMPORTANT (prevents overflow)
    marginRight: 6, // space before icon
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    maxWidth: '75%', // 🔥 important for long property
  },

  chipText: {
    marginHorizontal: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#0F2027',
    flexShrink: 1, // 🔥 prevents overflow
  },

  bigInput: {
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  inputText: { flex: 1, color: '#000' },
});
