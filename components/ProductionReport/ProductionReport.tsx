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
  Alert,
  ScrollView,
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
//import DateTimePickerModal from 'react-native-modal-datetime-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const [storePickerVisible, setStorePickerVisible] = useState(false);

  const [getFromDate, setFromDate] = useState(null);

  const [getToDate, setToDate] = useState(null);
  const [checkingDatePickerVisible, setCheckingDatePickerVisible] =
    useState(false);
  const [checkingDatePickerVisible1, setCheckingDatePickerVisible1] =
    useState(false);

  const [getAllMachineGroups, setAllMachineGroups] = useState([]);
  const [machinegroupPickerVisible, setMachineGroupPickerVisible] =
    useState(false);
  const [selectedMachineGroup, setSelectedMachineGroup] = useState(null);
  const [machineGroupSearch, setMachineGroupSearch] = useState('');

  const [getAllMachineSubGroups, setAllMachineSubGroups] = useState([]);
  const [machinesubgroupPickerVisible, setMachineSubGroupPickerVisible] =
    useState(false);
  const [selectedMachineSubGroup, setSelectedMachineSubGroup] = useState(null);
  const [machineSubGroupSearch, setMachineSubGroupSearch] = useState('');

  const [getAllMachines, setAllMachines] = useState([]);
  const [machinePickerVisible, setMachinePickerVisible] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machineSearch, setMachineSearch] = useState('');

  const [getAllData, setAllData] = useState([]);

  const [alertData, setAlertData] = useState({
    visible: false,
    message: '',
    type: 'warning',
  });

  const showWarning = msg => {
    setAlertData({
      visible: true,
      message: msg,
      type: 'warning',
    });
  };

  const showSuccess = msg => {
    setAlertData({
      visible: true,
      message: msg,
      type: 'success',
    });
  };

  const showError = msg => {
    setAlertData({
      visible: true,
      message: msg,
      type: 'error',
    });
  };

  const getToken = () => token;

  // PROPERTY
  useEffect(() => {
    const load = async () => {
      console.log('token --> ', token);
      const data = await fetchPropertyData(token);
      setPropertyData(data || []);

      if (data?.length) setSelectedProperty(data[0]);

      //   if (data && data.length > 0) {
      //     await fetchAllYeardata(token, data[0].PrpCode);
      //   }
    };

    setTimeout(() => {
      load();
    }, 2000);
  }, [token]);

  const selectProperty = item => {
    setSelectedProperty(item);

    const updated = [
      item,
      ...recentProps.filter(p => p.PrpCode !== item.PrpCode),
    ];
    setRecentProps(updated.slice(0, 3));
  };

  useEffect(() => {
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

        setYearOptions(allyeardata);
        setSelectedYear(allyeardata[0].YearName);
      };

      setTimeout(() => {
        testFunc();
      }, 2000);
    }
  }, [selectedProperty]);

  useEffect(() => {
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
        const allstoredata = await fetchAllStoredata(
          token,
          selectedProperty.PrpCode,
          yearno,
        );

        setAllStoreData(allstoredata);
        setSelectedStore(allstoredata[0]);
      };

      setTimeout(() => {
        testFuncyear();
      }, 2000);
    }
  }, [selectedYear]);

  //   const filteredData = getAllData.filter(i =>
  //     i.rowuid?.toLowerCase().includes(search.toLowerCase()),
  //   );

  const filteredData = getAllData.filter(item => {
    const s = search.toLowerCase();

    return (
      item.vouno?.toLowerCase().includes(s) ||
      item.mgrpname?.toLowerCase().includes(s) ||
      item.msgrpname?.toLowerCase().includes(s) ||
      item.macname?.toLowerCase().includes(s) ||
      item.mername?.toLowerCase().includes(s) ||
      item.prodorderqty?.toString().includes(s) ||
      item.doffqty?.toString().includes(s) ||
      item.packingqty?.toString().includes(s)
    );
  });

  const formatFull = date =>
    date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const getMachineGroupData = async () => {
    let prp1 = selectedProperty ? selectedProperty.PrpCode : '';
    let yearnumber1 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';

    if (typeof prp1 == 'undefined' || prp1 == null || prp1 == '') {
      showWarning('Please select property');
      return;
    } else if (
      typeof yearnumber1 == 'undefined' ||
      yearnumber1 == null ||
      yearnumber1 == ''
    ) {
      showWarning('Please select yaer');
      return;
    } else if (
      typeof finalStrCode == 'undefined' ||
      finalStrCode == null ||
      finalStrCode == ''
    ) {
      showWarning('Please select store');
      return;
    }

    try {
      const payload = {
        fetch: 'macgrp',
        txntype: 'mob_production_report',
        prptype: '',
        prpcode: prp1,
        yearno: yearnumber1,
        strcode: finalStrCode,
      };

      const responsemacgrp = await axios.get(`${API}/api/get_criterion`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        params: payload,
      });

      if (
        responsemacgrp.data.success &&
        responsemacgrp.data.response.data.length > 0
      ) {
        setAllMachineGroups(responsemacgrp.data.response.data);
        if (
          responsemacgrp.data.response.data &&
          responsemacgrp.data.response.data.length > 0
        ) {
          setSelectedMachineGroup(
            responsemacgrp.data.response.data[0].MGrpName,
          );
        }
      } else {
        console.log('❌ API success false:', responsemacgrp?.data);
      }
    } catch (error) {
      console.log('❌ fetchPropertyData error:', error);
    }

    setMachineGroupPickerVisible(true);
  };
  const getMachineSubGroupData = async () => {
    let prp2 = selectedProperty ? selectedProperty.PrpCode : '';
    let yearnumber2 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
    let macgrp2 = selectedMachineGroup ? selectedMachineGroup.MacGrp : '';

    if (typeof prp2 == 'undefined' || prp2 == null || prp2 == '') {
      showWarning('Please select property');
      return;
    } else if (
      typeof yearnumber2 == 'undefined' ||
      yearnumber2 == null ||
      yearnumber2 == ''
    ) {
      showWarning('Please select yaer');
      return;
    } else if (
      typeof finalStrCode == 'undefined' ||
      finalStrCode == null ||
      finalStrCode == ''
    ) {
      showWarning('Please select store');
      return;
    }

    try {
      const payload = {
        fetch: 'macsgrp',
        txntype: 'mob_production_report',
        prptype: '',
        prpcode: prp2,
        yearno: yearnumber2,
        macgrp: macgrp2,
        strcode: finalStrCode,
      };

      const responsemacsgrp = await axios.get(`${API}/api/get_criterion`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        params: payload,
      });

      if (
        responsemacsgrp.data.success &&
        responsemacsgrp.data.response.data.length > 0
      ) {
        setAllMachineSubGroups(responsemacsgrp.data.response.data);
        if (
          responsemacsgrp.data.response.data &&
          responsemacsgrp.data.response.data.length > 0
        ) {
          setSelectedMachineSubGroup(
            responsemacsgrp.data.response.data[0].MSGrpName,
          );
        }
      } else {
        console.log('❌ API success false:', responsemacsgrp?.data);
      }
    } catch (error) {
      console.log('❌ fetchPropertyData error:', error);
    }

    setMachineSubGroupPickerVisible(true);
  };

  const getMachineData = async () => {
    let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
    let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
    let macgrp3 = selectedMachineGroup ? selectedMachineGroup?.MacGrp : '';
    let macsgrp3 = selectedMachineSubGroup
      ? selectedMachineSubGroup?.MacSGrp
      : '';

    if (typeof prp3 == 'undefined' || prp3 == null || prp3 == '') {
      showWarning('Please select property');
      return;
    } else if (
      typeof yearnumber3 == 'undefined' ||
      yearnumber3 == null ||
      yearnumber3 == ''
    ) {
      showWarning('Please select yaer');
      return;
    } else if (
      typeof finalStrCode == 'undefined' ||
      finalStrCode == null ||
      finalStrCode == ''
    ) {
      showWarning('Please select store');
      return;
    }

    try {
      const payload = {
        fetch: 'machine',
        txntype: 'mob_production_report',
        prptype: '',
        prpcode: prp3,
        yearno: yearnumber3,
        macgrp: macgrp3,
        macsgrp: macsgrp3,
        strcode: finalStrCode,
      };

      const respo = await axios.get(`${API}/api/get_criterion`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        params: payload,
      });

      if (respo.data.success && respo.data.response.data.length > 0) {
        setAllMachines(respo.data.response.data);
        if (respo.data.response.data && respo.data.response.data.length > 0) {
          setSelectedMachine(respo.data.response.data[0].MacName);
        }
      } else {
        console.log('❌ API success false:', respo?.data);
      }
    } catch (error) {
      console.log('❌ machine api error:', error);
    }

    setMachinePickerVisible(true);
  };

  const fetchData = async () => {
    let finalPrpCode = selectedProperty ? selectedProperty?.PrpCode : '';
    let finalYearNo = selectedYear ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
    let finalMacGrp = selectedMachineGroup ? selectedMachineGroup?.MacGrp : '';
    let finalMacSGrp = selectedMachineSubGroup
      ? selectedMachineSubGroup?.MacSGrp
      : '';
    let finalMacCode = selectedMachine ? selectedMachine?.MacCode : '';

    let fd = '';
    let resfd = '';
    let finalfromdate = '';

    let td = '';
    let restd = '';
    let finaltodate = '';

    if (fd != '') {
      fd = getFromDate ? getFromDate.toISOString().split('T')[0] : '';
      resfd = fd.split('-');
      finalfromdate = resfd[2] + '-' + resfd[1] + '-' + resfd[0];
    }

    if (td != '') {
      td = getToDate ? getToDate.toISOString().split('T')[0] : '';
      restd = td.split('-');
      finaltodate = restd[2] + '-' + restd[1] + '-' + restd[0];
    }

    if (
      typeof finalPrpCode == 'undefined' ||
      finalPrpCode == null ||
      finalPrpCode == ''
    ) {
      showWarning('Please select property');
      return;
    } else if (
      typeof finalYearNo == 'undefined' ||
      finalYearNo == null ||
      finalYearNo == ''
    ) {
      showWarning('Please select yaer');
      return;
    } else if (
      typeof finalStrCode == 'undefined' ||
      finalStrCode == null ||
      finalStrCode == ''
    ) {
      showWarning('Please select store');
      return;
    } else {
      setLoading(true);
      const payload = {
        prptype: '',
        txntype: 'mob_production_report',
        prpcode: finalPrpCode,
        yearno: finalYearNo,
        strcode: finalStrCode,
        macgrp: finalMacGrp,
        macsgrp: finalMacSGrp,
        maccode: finalMacCode,
        fromdate: finalfromdate,
        todate: finaltodate,
      };

      const headers = {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'X-Requested-with': 'XMLHttpRequest',
      };

      console.log('proproductionreport API payload', payload);
      console.log(
        'proproductionreport API URL',
        `${API}/api/prodproductionreport`,
      );
      //console.log("userPtype :", userPtype)

      try {
        const response = await axios.post(
          `${API}/api/prodproductionreport`,
          payload,
          { headers },
        );
        console.log('proproductionreport API response', response);

        if (response.data.success === true && response.data.data.length === 0) {
          Alert.alert('No Data Found');

          setAllData([]);
        } else if (
          response.data.success === true &&
          response.data.data.length > 0
        ) {
          setAllData(response.data.data);
        } else if (response.data.success === false) {
          Alert.alert(`${response.data.message}`);

          setAllData([]);
        } else {
          Alert.alert(`${response.data.message}`);

          setAllData([]);
        }
      } catch (error) {
        setLoading(false);
        setAllData([]);
        Alert.alert('Server Error');
      } finally {
        setLoading(false);
        // handleCriteriaFormClose()
        // setCriteriaFormOpen(false)
      }
    }
  };

  function formatDate(input = '') {
    // Handle empty, null, undefined, or 0
    if (!input || input === 0) return '';

    const str = String(input);

    // Validate length (must be YYYYMMDD = 8 chars)
    if (str.length !== 8) return '';

    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);

    return `${day}/${month}/${year}`;
  }

  const calcQty = (a = 0, b = 0) => {
    let a1 = typeof a == 'undefined' || a == null || a == '' ? 0 : a;
    let b1 = typeof b == 'undefined' || b == null || b == '' ? 0 : b;
    let c1 = 0;
    let c = 0;

    c1 = parseFloat(a1) - parseFloat(b1);
    c = parseFloat(c1).toFixed(3);

    return c;
  };

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

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Icon name="search" size={18} color="#888" style={{ marginRight: 8 }} />

        <TextInput
          placeholder="Search here..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(i, index) => index.toString()}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const scale = new Animated.Value(1);

          const onPressIn = () => {
            Animated.spring(scale, {
              toValue: 0.97,
              useNativeDriver: true,
            }).start();
          };

          const onPressOut = () => {
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
            }).start();
          };

          return (
            <AnimatedTouchable
              style={[styles.proCard, { transform: [{ scale }] }]}
              activeOpacity={0.9}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
            >
              {/* TOP GRADIENT STRIP */}
              <LinearGradient
                colors={['#0F6C7B', '#1399A8']}
                style={styles.cardTop}
              >
                <Text style={styles.voucherText}>#{item.vouno}</Text>
                <Text style={styles.dateText}>{formatDate(item.voudate)}</Text>
              </LinearGradient>

              {/* BODY */}
              <View style={styles.cardBody}>
                {/* MACHINE INFO */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Machine Info</Text>

                  <Text style={styles.infoText}>
                    group : {item.mgrpname} | sub group : {item.msgrpname}
                  </Text>

                  <Text style={styles.machineName}>{item.macname}</Text>
                </View>

                {/* DIVIDER */}
                <View style={styles.divider} />

                {/* QTY GRID */}
                <View style={styles.qtyRow}>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyLabel}>Order qty</Text>
                    <Text style={styles.qtyValue}>{item.prodorderqty}</Text>
                  </View>

                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyLabel}>Doff</Text>
                    <Text style={styles.qtyValue}>{item.doffqty}</Text>
                  </View>

                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyLabel}>Packing</Text>
                    <Text style={styles.qtyValue}>{item.packingqty || 0}</Text>
                  </View>
                </View>

                {/* REMAIN HIGHLIGHT */}
                <View style={styles.remainBox}>
                  <Text style={styles.remainLabel}>Remaining</Text>
                  <Text style={styles.remainValue}>
                    {calcQty(item.doffqty, item.packingqty)}
                  </Text>
                </View>

                {/* FOOTER */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Merge: {item.mername || '-'}
                  </Text>
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
      <Modal
        transparent
        visible={filterVisible}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.title}></Text>
                <TouchableOpacity onPress={() => setFilterVisible(false)}>
                  <Icon name="close" size={20} style={{ color: '#000' }} />
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

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 10,
                }}
              >
                {/* YEAR → 30% */}
                <View style={{ flex: 0.4, marginRight: 8 }}>
                  <Text style={styles.label}>Year</Text>
                  <TouchableOpacity
                    style={styles.bigInput}
                    onPress={() => setYearPickerVisible(true)}
                  >
                    <Text numberOfLines={1} style={styles.inputText}>
                      {selectedYear || 'Year'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={20} />
                  </TouchableOpacity>
                </View>

                {/* STORE → 70% */}
                <View style={{ flex: 0.6, marginLeft: 8 }}>
                  <Text style={styles.label}>Store</Text>
                  <TouchableOpacity
                    style={styles.bigInput}
                    onPress={() => setStorePickerVisible(true)}
                  >
                    <Text numberOfLines={1} style={styles.inputText}>
                      {selectedStore?.StrName || 'Select Store'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={20} />
                  </TouchableOpacity>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 10,
                }}
              >
                {/* FROM DATE */}
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>From date</Text>
                  <TouchableOpacity
                    style={styles.bigInput}
                    onPress={() => setCheckingDatePickerVisible(true)}
                  >
                    <Text style={styles.inputText}>
                      {getFromDate ? formatFull(getFromDate) : 'From date'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={20} />
                  </TouchableOpacity>
                </View>

                {/* TO DATE */}
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>To date</Text>
                  <TouchableOpacity
                    style={styles.bigInput}
                    onPress={() => setCheckingDatePickerVisible1(true)}
                  >
                    <Text style={styles.inputText}>
                      {getToDate ? formatFull(getToDate) : 'To date'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={20} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>Machine group</Text>
              <TouchableOpacity
                style={styles.inputBox}
                onPress={getMachineGroupData}
              >
                <Text numberOfLines={1} style={{ color: '#000' }}>
                  {selectedMachineGroup?.MGrpName || 'Select machine group'}
                </Text>
                <Icon name="keyboard-arrow-down" size={24} />
              </TouchableOpacity>

              <Text style={styles.label}>Machine sub group</Text>
              <TouchableOpacity
                style={styles.inputBox}
                onPress={getMachineSubGroupData}
              >
                <Text numberOfLines={1} style={{ color: '#000' }}>
                  {selectedMachineSubGroup?.MSGrpName ||
                    'Select machine sub group'}
                </Text>
                <Icon name="keyboard-arrow-down" size={24} />
              </TouchableOpacity>

              <Text style={styles.label}>Machine</Text>
              <TouchableOpacity
                style={styles.inputBox}
                onPress={getMachineData}
              >
                <Text numberOfLines={1} style={{ color: '#000' }}>
                  {selectedMachine?.MacName || 'Select machine'}
                </Text>
                <Icon name="keyboard-arrow-down" size={24} />
              </TouchableOpacity>

              {/* APPLY */}
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  fetchData();
                  setFilterVisible(false);
                }}
              >
                <Text style={{ color: '#fff' }}>OK</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {checkingDatePickerVisible && (
        <DateTimePicker
          value={getFromDate || new Date()}
          mode="date"
          //   onChange={(e, d) => {
          //     if (d) setFromDate(d);
          //     setCheckingDatePickerVisible(false);
          //   }}
          onChange={(event, selectedDate) => {
            if (event.type === 'set' && selectedDate) {
              setFromDate(selectedDate);
            }

            setCheckingDatePickerVisible(false);
          }}
        />
      )}

      {checkingDatePickerVisible1 && (
        <DateTimePicker
          value={getToDate || new Date()}
          mode="date"
        //   onChange={(e, d) => {
        //     console.log('ToDate :', d);
        //     if (d) setToDate(d);

        //     setCheckingDatePickerVisible1(false);
        //   }}
            onChange={(event, selectedDate) => {
              if (event.type === 'set' && selectedDate) {
                setToDate(selectedDate);
              }

              setCheckingDatePickerVisible1(false);
            }}
        />
      )}

      {/* /**machine group */}
      <Modal
        visible={machinegroupPickerVisible}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* HEADER */}
          <View style={styles.pickerHeader}>
            <TouchableOpacity
              onPress={() => setMachineGroupPickerVisible(false)}
            >
              <Icon name="arrow-back-ios" size={20} color="#000" />
            </TouchableOpacity>

            <Text style={styles.pickerTitle}>Select machine group</Text>
            <View style={{ width: 20 }} />
          </View>

          <View style={styles.pickerSearch}>
            <Icon name="search" size={18} color="#777" />
            <TextInput
              placeholder="Search machine group..."
              placeholderTextColor="#000"
              value={machineGroupSearch}
              onChangeText={setMachineGroupSearch}
              style={{ flex: 1, color: '#000' }}
            />
          </View>

          {/* LIST */}
          <FlatList
            //data={getAllMachineGroups}
            data={getAllMachineGroups.filter(p =>
              p.MGrpName.toLowerCase().includes(
                machineGroupSearch.toLowerCase(),
              ),
            )}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  setSelectedMachineGroup(item);
                  setMachineGroupPickerVisible(false);
                }}
              >
                <Text style={{ color: '#000' }}>{item.MGrpName}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* /**machine SUB group */}
      <Modal
        visible={machinesubgroupPickerVisible}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* HEADER */}
          <View style={styles.pickerHeader}>
            <TouchableOpacity
              onPress={() => setMachineSubGroupPickerVisible(false)}
            >
              <Icon name="arrow-back-ios" size={20} color="#000" />
            </TouchableOpacity>

            <Text style={styles.pickerTitle}>Select machine sub group</Text>
            <View style={{ width: 20 }} />
          </View>

          <View style={styles.pickerSearch}>
            <Icon name="search" size={18} color="#777" />
            <TextInput
              placeholder="Search machine group..."
              placeholderTextColor="#000"
              value={machineSubGroupSearch}
              onChangeText={setMachineSubGroupSearch}
              style={{ flex: 1, color: '#000' }}
            />
          </View>

          {/* LIST */}
          <FlatList
            //data={getAllMachineSubGroups}
            data={getAllMachineSubGroups.filter(p =>
              p.MSGrpName.toLowerCase().includes(
                machineSubGroupSearch.toLowerCase(),
              ),
            )}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  setSelectedMachineSubGroup(item);
                  setMachineSubGroupPickerVisible(false);
                }}
              >
                <Text style={{ color: '#000' }}>{item.MSGrpName}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* /**machine  */}
      <Modal
        visible={machinePickerVisible}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setMachinePickerVisible(false)}>
              <Icon name="arrow-back-ios" size={20} color="#000" />
            </TouchableOpacity>

            <Text style={styles.pickerTitle}>Select machine</Text>
            <View style={{ width: 20 }} />
          </View>

          <View style={styles.pickerSearch}>
            <Icon name="search" size={18} color="#777" />
            <TextInput
              placeholder="Search machine group..."
              placeholderTextColor="#000"
              value={machineSearch}
              onChangeText={setMachineSearch}
              style={{ flex: 1, color: '#000' }}
            />
          </View>

          <FlatList
            //data={getAllMachines}
            data={getAllMachines.filter(p =>
              p.MacName.toLowerCase().includes(machineSearch.toLowerCase()),
            )}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  setSelectedMachine(item);
                  setMachinePickerVisible(false);
                }}
              >
                <Text style={{ color: '#000' }}>{item.MacName}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <Modal
        visible={storePickerVisible}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* HEADER */}
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setStorePickerVisible(false)}>
              <Icon name="arrow-back-ios" size={20} color="#000" />
            </TouchableOpacity>

            <Text style={styles.pickerTitle}>Select Store</Text>
            <View style={{ width: 20 }} />
          </View>

          {/* LIST */}
          <FlatList
            data={getAllStoreData}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  setSelectedStore(item);
                  setStorePickerVisible(false);
                }}
              >
                <Text style={{ color: '#000' }}>{item.StrName}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <Modal
        visible={yearPickerVisible}
        animationType="slide"
        statusBarTranslucent={true}
      >
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
      <Modal
        visible={propertyPickerVisible}
        animationType="slide"
        statusBarTranslucent={true}
      >
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

      <Modal transparent visible={alertData.visible} animationType="fade">
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <View
            style={{
              width: '85%',
              backgroundColor: '#fff',
              borderRadius: 15,
              padding: 20,
              alignItems: 'center',
            }}
          >
            <Icon
              name={
                alertData.type === 'success'
                  ? 'check-circle'
                  : alertData.type === 'error'
                  ? 'error'
                  : 'warning'
              }
              size={40}
              color={
                alertData.type === 'success'
                  ? '#4CAF50'
                  : alertData.type === 'error'
                  ? '#F44336'
                  : '#FFA000'
              }
            />

            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                marginTop: 10,
                color: '#000',
              }}
            >
              {alertData.type === 'success'
                ? 'Success'
                : alertData.type === 'error'
                ? 'Error'
                : 'Warning'}
            </Text>

            <Text style={{ textAlign: 'center', marginTop: 8, color: '#444' }}>
              {alertData.message}
            </Text>

            <TouchableOpacity
              onPress={() => setAlertData({ visible: false, message: '' })}
              style={{
                marginTop: 15,
                backgroundColor: '#0F6C7B',
                paddingHorizontal: 25,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>OK</Text>
            </TouchableOpacity>
          </View>
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
    marginTop: 18, // ✅ floating effect like modern apps
    paddingHorizontal: 12,
    height: 35, // ✅ FIX height
    borderRadius: 10,
    elevation: 4,
  },

  searchInput: {
    flex: 1,
    fontSize: 12,
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
    backgroundColor: '#e9e6e6',
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
  label: { marginTop: 8, color: '#6e6e6e' },

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

  //   section: {
  //     marginLeft: 15,
  //     marginTop: 10,
  //     fontWeight: '600',
  //     color: '#000',
  //   },
  // card: {
  //   flexDirection: 'row',
  //   backgroundColor: '#fff',
  //   borderRadius: 18,
  //   padding: 16,
  //   marginBottom: 14,
  //   elevation: 4,
  //   shadowColor: '#000',
  //   shadowOpacity: 0.08,
  //   shadowRadius: 8,
  // },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
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
  // topRow: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   marginBottom: 4,
  // },

  topRow: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingBottom: 6,
  },

  codeBadge: {
    flexDirection: 'row', // 🔥 THIS MAKES IT SIDE BY SIDE
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    // backgroundColor: '#E3F2FD',
    // paddingHorizontal: 10,
    // paddingVertical: 4,
    // borderRadius: 8,
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

  // codeBadge: {
  //   backgroundColor: '#E3F2FD',
  //   paddingHorizontal: 10,
  //   paddingVertical: 4,
  //   borderRadius: 8,
  // },

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

  // codeRow: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   marginTop: 4,
  // },

  // codeLabel: {
  //   width: 80, // 🔥 FIXED WIDTH (adjust as needed)
  //   color: '#757575',
  //   fontSize: 12,
  //   fontWeight: '600',
  // },

  // codeValue: {
  //   flex: 1, // 🔥 TAKES REMAINING SPACE
  //   color: '#000',
  //   fontSize: 14,
  //   fontWeight: '600',
  // },
  content: {
    flex: 1,
  },

  headerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F6C7B',
  },

  twoColumnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  column: {
    flex: 1,
    paddingRight: 6,
  },

  codeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  codeLabel: {
    width: 55,
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },

  codeValue: {
    flex: 1,
    fontSize: 13,
    color: '#000',
    fontWeight: '600',
    flexWrap: 'wrap',
  },

  proCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 18,
    overflow: 'hidden',

    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },

  cardTop: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  voucherText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  dateText: {
    color: '#E0F7FA',
    fontSize: 12,
  },

  cardBody: {
    padding: 10,
  },

  section: {
    marginBottom: 2,
  },

  sectionTitle: {
    fontSize: 11,
    color: '#888',
    //marginBottom: 2,
  },

  infoText: {
    fontSize: 12,
    color: '#555',
  },

  machineName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 3,
  },

  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  qtyBox: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    padding: 5,
    borderRadius: 10,
    marginRight: 6,
  },

  qtyLabel: {
    fontSize: 10,
    color: '#777',
  },

  qtyValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F6C7B',
  },

  remainBox: {
    //marginTop: 3,
    backgroundColor: '#E8F5E9',
    padding: 3,
    borderRadius: 10,
    alignItems: 'center',
  },

  remainLabel: {
    fontSize: 11,
    color: '#2E7D32',
  },

  remainValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B5E20',
  },

  footer: {
    //marginTop: 5,
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingTop: 0,
  },

  footerText: {
    fontSize: 11,
    color: '#161515',
  },
});
