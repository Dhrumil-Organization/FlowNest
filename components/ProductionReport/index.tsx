import { PlatformDatePicker } from '@/common/PlatformDatePicker';
import Icon from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { API } from '../../common/API/dynamicAPI';
import {
  fetchAllStoredata,
  fetchAllYeardata,
  fetchPropertyData,
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
const ProductionReport = ({ token }) => {
  const router = useRouter();
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
  const [machineGroupSearch, setMachineGroupSearch] = useState('');
  const [getAllMachineSubGroups, setAllMachineSubGroups] = useState([]);
  const [machinesubgroupPickerVisible, setMachineSubGroupPickerVisible] =
    useState(false);
  const [machineSubGroupSearch, setMachineSubGroupSearch] = useState('');
  const [getAllMachines, setAllMachines] = useState([]);
  const [machinePickerVisible, setMachinePickerVisible] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machineSearch, setMachineSearch] = useState('');
  const [selectedMachineGroups, setSelectedMachineGroups] = useState([]);
  const [selectedMachineSubGroups, setSelectedMachineSubGroups] = useState([]);
  const [selectedMachines, setSelectedMachines] = useState([]);
  const [getAllData, setAllData] = useState([]);
  const [getAllInfoData, setAllInfoData] = useState([]);
  const [productionType, setProductionType] = useState('running');
  const [expandedId, setExpandedId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [infoData, setInfoData] = useState({});
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
    if (!token) return;
    const load = async () => {
      const data = await fetchPropertyData(token);
      setPropertyData(data || []);

      if (data?.length) setSelectedProperty(data[0]);
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
    if (!token) return;
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
  }, [selectedProperty, token]);

  useEffect(() => {
    if (!token) return;
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
  }, [selectedYear, token]);

  const filteredData = getAllData.filter(item => {
    const s = search.toLowerCase();

    return (
      item.vouno?.toLowerCase().includes(s) ||
      item.mgrpname?.toLowerCase().includes(s) ||
      item.itmname?.toLowerCase().includes(s) ||
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
    let convertedStatus = '';

    if (productionType == 'all') {
      convertedStatus = '-1';
    } else if (productionType == 'running') {
      convertedStatus = '0';
    } else if (productionType == 'closed') {
      convertedStatus = '2';
    }

    let status = convertedStatus; // 'all' | 'running' | 'closed'

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
        productiontype: status,
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
      } else {
        console.log('macgrp API success false:', responsemacgrp?.data);
      }
    } catch (error) {
      console.log('macgrp error:', error);
    }

    setMachineGroupPickerVisible(true);
  };
  const getMachineSubGroupData = async () => {
    let prp2 = selectedProperty ? selectedProperty.PrpCode : '';
    let yearnumber2 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';

    let macgrp2 =
      selectedMachineGroups && selectedMachineGroups.length > 0
        ? selectedMachineGroups.map(i => i.MacGrp)
        : [];
    let convertedStatus = '';

    if (productionType == 'all') {
      convertedStatus = '-1';
    } else if (productionType == 'running') {
      convertedStatus = '0';
    } else if (productionType == 'closed') {
      convertedStatus = '2';
    }

    let status = convertedStatus;

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
        productiontype: status,
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
      } else {
        console.log('macsgrp API success false:', responsemacsgrp?.data);
      }
    } catch (error) {
      console.log('macsgrp error:', error);
    }

    setMachineSubGroupPickerVisible(true);
  };

  const getMachineData = async () => {
    let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
    let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';

    let macgrp3 =
      selectedMachineGroups && selectedMachineGroups.length > 0
        ? selectedMachineGroups.map(i => i.MacGrp)
        : [];
    let macsgrp3 =
      selectedMachineSubGroups && selectedMachineSubGroups.length > 0
        ? selectedMachineSubGroups.map(i => i.MacSGrp)
        : [];

    let convertedStatus = '';
    if (productionType == 'all') {
      convertedStatus = '-1';
    } else if (productionType == 'running') {
      convertedStatus = '0';
    } else if (productionType == 'closed') {
      convertedStatus = '2';
    }
    let status = convertedStatus;

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
        productiontype: status,
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
      } else {
        console.log('machine API success false:', respo?.data);
      }
    } catch (error) {
      console.log('machine api error:', error);
    }

    setMachinePickerVisible(true);
  };

  const fetchData = async () => {
    let finalPrpCode = selectedProperty ? selectedProperty?.PrpCode : '';
    let finalYearNo = selectedYear ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';

    let finalMacGrp =
      selectedMachineGroups && selectedMachineGroups.length > 0
        ? selectedMachineGroups.map(i => i.MacGrp)
        : [];
    let finalMacSGrp =
      selectedMachineSubGroups && selectedMachineSubGroups.length > 0
        ? selectedMachineSubGroups.map(i => i.MacSGrp)
        : [];
    let finalMacCode =
      selectedMachines && selectedMachines.length > 0
        ? selectedMachines.map(i => i.MacCode)
        : [];

    // let fd = '';
    // let resfd = '';
    // let finalfromdate = '';

    // let td = '';
    // let restd = '';
    // let finaltodate = '';

    let convertedStatus = '';
    if (productionType == 'all') {
      convertedStatus = '-1';
    } else if (productionType == 'running') {
      convertedStatus = '0';
    } else if (productionType == 'closed') {
      convertedStatus = '2';
    }
    let status = convertedStatus;

    // if (fd != '') {
    //   fd = getFromDate ? getFromDate.toISOString().split('T')[0] : '';
    //   resfd = fd.split('-');
    //   finalfromdate = resfd[2] + '-' + resfd[1] + '-' + resfd[0];
    // }

    // if (td != '') {
    //   td = getToDate ? getToDate.toISOString().split('T')[0] : '';
    //   restd = td.split('-');
    //   finaltodate = restd[2] + '-' + restd[1] + '-' + restd[0];
    // }

    let finalfromdate = '';
    let finaltodate = '';

    if (getFromDate) {
      const fd = getFromDate.toISOString().split('T')[0];
      const resfd = fd.split('-');
      finalfromdate = resfd[2] + '-' + resfd[1] + '-' + resfd[0];
    }

    if (getToDate) {
      const td = getToDate.toISOString().split('T')[0];
      const restd = td.split('-');
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
        productiontype: status,
        action: 'report',
      };

      const headers = {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'X-Requested-with': 'XMLHttpRequest',
      };

      console.log('payload :---', payload);

      try {
        const response = await axios.post(
          `${API}/api/prodproductionreport`,
          payload,
          { headers },
        );

        if (response.data.success === true && response.data.data.length === 0) {
          showWarning('No Data Found');

          setAllData([]);
        } else if (
          response.data.success === true &&
          response.data.data.length > 0
        ) {
          setAllData(response.data.data);
        } else if (response.data.success === false) {
          showWarning(`${response.data.message}`);

          setAllData([]);
        } else {
          showWarning(`${response.data.message}`);

          setAllData([]);
        }
      } catch (error) {
        setLoading(false);
        setAllData([]);

        showWarning('Server Error');
      } finally {
        setLoading(false);
      }
    }
  };

  const getInfoData = async (row = {}) => {
    let finalPrpCode = selectedProperty ? selectedProperty?.PrpCode : '';
    let finalYearNo = selectedYear ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';

    let finalMacGrp =
      selectedMachineGroups && selectedMachineGroups.length > 0
        ? selectedMachineGroups.map(i => i.MacGrp)
        : [];
    let finalMacSGrp =
      selectedMachineSubGroups && selectedMachineSubGroups.length > 0
        ? selectedMachineSubGroups.map(i => i.MacSGrp)
        : [];
    let finalMacCode =
      selectedMachines && selectedMachines.length > 0
        ? selectedMachines.map(i => i.MacCode)
        : [];

    let fd = '';
    let resfd = '';
    // let finalfromdate = '';

    let td = '';
    let restd = '';
    // let finaltodate = '';

    let convertedStatus = '';
    if (productionType == 'all') {
      convertedStatus = '-1';
    } else if (productionType == 'running') {
      convertedStatus = '0';
    } else if (productionType == 'closed') {
      convertedStatus = '2';
    }
    let status = convertedStatus;

    // if (fd != '') {
    //   fd = getFromDate ? getFromDate.toISOString().split('T')[0] : '';
    //   resfd = fd.split('-');
    //   finalfromdate = resfd[2] + '-' + resfd[1] + '-' + resfd[0];
    // }

    // if (td != '') {
    //   td = getToDate ? getToDate.toISOString().split('T')[0] : '';
    //   restd = td.split('-');
    //   finaltodate = restd[2] + '-' + restd[1] + '-' + restd[0];
    // }

    const finalfromdate = formatDateForAPI(getFromDate);
    const finaltodate = formatDateForAPI(getToDate);

    // if (getFromDate) {
    //   const fd = getFromDate.toISOString().split('T')[0];
    //   const resfd = fd.split('-');

    //   finalfromdate =
    //     resfd[2] + '-' + resfd[1] + '-' + resfd[0];
    // }

    // if (getToDate) {
    //   const td = getToDate.toISOString().split('T')[0];
    //   const restd = td.split('-');

    //   finaltodate =
    //     restd[2] + '-' + restd[1] + '-' + restd[0];
    // }

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
      productiontype: status,
      action: 'packinginfo',
      uid: row.uid,
      vouno: row.vouno,
      voudate: row.voudate,
      mgrpname: row.mgrpname,
      msgrpname: row.msgrpname,
      macname: row.macname,
      itmname: row.itmname,
      mername: row.mername,
      prodorderqty: row.prodorderqty,
      doffqty: row.doffqty,
      packingqty: row.packingqty,
    };

    console.log("payload ::", payload)

    const headers = {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'X-Requested-with': 'XMLHttpRequest',
    };

    try {
      const response = await axios.post(
        `${API}/api/prodproductionreport`,
        payload,
        { headers },
      );

      if (response.data.success === true && response.data.data.length === 0) {
        setAllInfoData([]);

        return [];
      } else if (
        response.data.success === true &&
        response.data.data.length > 0
      ) {
        setAllInfoData(response.data.data);

        return response.data.data;
      } else if (response.data.success === false) {
        setAllInfoData([]);
        return [];
      } else {
        setAllInfoData([]);
        return [];
      }
    } catch (error) {
      setAllInfoData([]);
      return [];

    } finally {
      setLoading(false);
    }
  };

  const formatDate = (input = '') => {
    if (!input || input === 0) return '';

    const str = String(input);

    if (str.length !== 8) return '';

    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);

    return `${day}/${month}/${year}`;
  };

  const calcQty = (a = 0, b = 0) => {
    let a1 = typeof a == 'undefined' || a == null || a == '' ? 0 : a;
    let b1 = typeof b == 'undefined' || b == null || b == '' ? 0 : b;
    let c1 = 0;
    let c = 0;

    c1 = parseFloat(a1) - parseFloat(b1);
    c = parseFloat(c1).toFixed(3);

    return c;
  };

  const toggleSelection = (item, list, setList, key) => {
    const exists = list.some(i => i[key] === item[key]);

    if (exists) {
      setList(list.filter(i => i[key] !== item[key]));
    } else {
      setList([...list, item]);
    }
  };

  const handleInfoPress = async item => {
    const id = String(item.vouno);

    if (expandedId === id) {
      setExpandedId(null);

      return;
    }

    setLoadingId(id);

    const result = await getInfoData(item);

    setInfoData(prev => ({
      ...prev,
      [id]: result,
    }));

    setLoadingId(null);
    setExpandedId(id);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  // ✅ Timezone-safe date formatter (dd-mm-yyyy)
  const formatDateForAPI = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) {
      return '';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FB' }}>
      <LinearGradient colors={['#0F6C7B', '#13879A']} style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
        >
          <Icon name="arrow-back-ios-new" size={18} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Production report</Text>

        <TouchableOpacity onPress={() => setFilterVisible(true)}>
          <Icon name="tune" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

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
          let leftTotal = 0;
          let leftTotal1 = 0;
          leftTotal1 = parseFloat(item.prodorderqty) - parseFloat(item.doffqty);
          leftTotal = parseFloat(leftTotal1).toFixed(3);

          let rightTotal = 0;
          let rightTotal1 = 0;
          rightTotal1 =
            parseFloat(item.prodorderqty) - parseFloat(item.packingqty);
          rightTotal = parseFloat(rightTotal1).toFixed(3);

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
              style={[styles.newCard, { transform: [{ scale }] }]}
              activeOpacity={0.9}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
            >
              <LinearGradient
                colors={['#0F6C7B', '#16A6B6']}
                style={styles.newHeader}
              >
                <View>
                  <Text style={styles.quality}>{item.itmname}</Text>
                  <Text style={styles.subText}>{item.mername}</Text>
                </View>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.vouno}</Text>
                </View>
              </LinearGradient>

              <View style={styles.newBody}>
                {loadingId === String(item.vouno) && (
                  <View style={styles.cardLoader}>
                    <ActivityIndicator size="large" color="#0F6C7B" />
                    <Text style={styles.loadingCardText}>
                      Loading details...
                    </Text>
                  </View>
                )}

                <Text style={styles.machine}>{item.macname}</Text>

                <Text style={styles.group}>
                  GROUP : {item.mgrpname} | SUB GROUP : {item.msgrpname}
                </Text>

                <View style={styles.statsRow}>
                  <View style={styles.statBoxLeft}>
                    <Text style={styles.statValue}>{item.prodorderqty}</Text>
                    <Text style={styles.statLabel}>Order</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{item.doffqty}</Text>
                    <Text style={styles.statLabel}>Doff</Text>
                  </View>

                  <View style={styles.statBox}>
                    <View style={styles.valueRow}>
                      <Text style={styles.statValue}>
                        {item.packingqty || 0}
                      </Text>

                      <TouchableOpacity onPress={() => handleInfoPress(item)}>
                        <Icon name="info-outline" size={19} color="#111" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.statLabel}>Packing</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBoxLeft}>
                    <Text
                      style={
                        parseFloat(leftTotal) < 0
                          ? styles.statValueRed
                          : styles.statValue
                      }
                    >
                      {leftTotal}
                    </Text>
                  </View>

                  <View style={styles.statBox}></View>

                  <View style={styles.statBox}>
                    <Text
                      style={
                        parseFloat(rightTotal) < 0
                          ? styles.statValueRed
                          : styles.statValue
                      }
                    >
                      {rightTotal}
                    </Text>
                  </View>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.footerDate}>
                    {formatDate(item.voudate)}
                  </Text>
                </View>

                {expandedId === item.vouno && (
                  <View style={styles.subCard}>
                    {loadingId === String(item.vouno) ? (
                      <Text style={styles.loadingText}>Loading...</Text>
                    ) : infoData[String(item.vouno)] &&
                      infoData[String(item.vouno)].length > 0 ? (
                      <View>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.th, { flex: 1 }]}>Grade</Text>
                          <Text
                            style={[
                              styles.th,
                              { width: 100, textAlign: 'right' },
                            ]}
                          >
                            Qty
                          </Text>
                        </View>

                        {infoData[String(item.vouno)].map((row, index) => (
                          <View
                            key={index}
                            style={[
                              styles.tableRow,
                              index % 2 === 0 && styles.altRow,
                            ]}
                          >
                            <Text style={[styles.td, { flex: 1 }]}>
                              {row.grdname}
                            </Text>

                            <Text
                              style={[
                                styles.td,
                                {
                                  width: 100,
                                  textAlign: 'right',
                                  fontWeight: '600',
                                },
                              ]}
                            >
                              {row.qty}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.noDataText}>
                        No grade details found
                      </Text>
                    )}
                  </View>
                )}
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
      {filterVisible && (
        <View style={styles.detailOverlay}>
          <View style={styles.detailContainer}>
            <View style={styles.overlay}>
              <View style={styles.sheet}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.title}></Text>
                    <TouchableOpacity onPress={() => setFilterVisible(false)}>
                      <Icon name="closed" size={20} style={{ color: '#000' }} />
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
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.label}>From date</Text>
                      <PlatformDatePicker
                        value={getFromDate}
                        onChange={setFromDate}
                        placeholder="From date"
                        style={styles.bigInput}
                        textStyle={styles.inputText}
                        formatFull={formatFull}
                      />
                    </View>

                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.label}>To date</Text>
                      <PlatformDatePicker
                        value={getToDate}
                        onChange={setToDate}
                        placeholder="To date"
                        style={styles.bigInput}
                        textStyle={styles.inputText}
                        formatFull={formatFull}
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>Select type</Text>
                  <View style={styles.radioRow}>
                    <TouchableOpacity
                      style={[
                        styles.radioBox,
                        productionType === 'all' && styles.radioBoxActive,
                      ]}
                      onPress={() => setProductionType('all')}
                    >
                      <View style={styles.radioOuter}>
                        {productionType === 'all' && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                      <Text style={styles.radioLabel}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.radioBox,
                        productionType === 'running' && styles.radioBoxActive,
                      ]}
                      onPress={() => setProductionType('running')}
                    >
                      <View style={styles.radioOuter}>
                        {productionType === 'running' && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                      <Text style={styles.radioLabel}>Running</Text>
                    </TouchableOpacity>
                    {/* <TouchableOpacity
                  style={[
                    styles.radioBox,
                    productionType === 'all' && styles.radioBoxActive,
                  ]}
                  onPress={() => setProductionType('all')}
                >
                  <View style={styles.radioOuter}>
                    {productionType === 'all' && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>All</Text>
                </TouchableOpacity> */}
                    <TouchableOpacity
                      style={[
                        styles.radioBox,
                        productionType === 'closed' && styles.radioBoxActive,
                      ]}
                      onPress={() => setProductionType('closed')}
                    >
                      <View style={styles.radioOuter}>
                        {productionType === 'closed' && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                      <Text style={styles.radioLabel}>Closed</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Machine group</Text>
                  <TouchableOpacity
                    style={styles.inputBox}
                    onPress={getMachineGroupData}
                  >
                    <Text numberOfLines={1} style={{ color: '#000' }}>
                      {(selectedMachineGroups &&
                        selectedMachineGroups.map(i => i.MGrpName).join(', ')) ||
                        'Select machine group'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={24} />
                  </TouchableOpacity>

                  <Text style={styles.label}>Machine sub group</Text>
                  <TouchableOpacity
                    style={styles.inputBox}
                    onPress={getMachineSubGroupData}
                  >
                    <Text numberOfLines={1} style={{ color: '#000' }}>
                      {(selectedMachineSubGroups &&
                        selectedMachineSubGroups
                          .map(i => i.MSGrpName)
                          .join(', ')) ||
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
                      {(selectedMachines &&
                        selectedMachines.map(i => i.MacName).join(', ')) ||
                        'Select machine'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={24} />
                  </TouchableOpacity>
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
          </View>
        </View>
      )}

      {checkingDatePickerVisible && (
        <View style={styles.detailOverlay123}>
          <View style={styles.detailContainer}>
            <DateTimePicker
              value={getFromDate || new Date()}
              mode="date"
              onChange={(event, selectedDate) => {
                if (event.type === 'set' && selectedDate) {
                  setFromDate(selectedDate);
                }
                setCheckingDatePickerVisible(false);
              }}
            />
          </View>

        </View>
      )}

      {checkingDatePickerVisible1 && (
        <View style={styles.detailOverlay123}>
          <View style={styles.detailContainer}>
            <DateTimePicker
              value={getToDate || new Date()}
              mode="date"
              onChange={(event, selectedDate) => {
                if (event.type === 'set' && selectedDate) {
                  setToDate(selectedDate);
                }

                setCheckingDatePickerVisible1(false);
              }}
            />
          </View>
        </View>
      )}

      {machinegroupPickerVisible && (
        <View style={styles.detailOverlay123}>
          <View style={styles.detailContainer}>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
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
              {selectedMachineGroups.length > 0 && (
                <>
                  <Text style={styles.section1}>Selected</Text>

                  <View style={styles.selectedBox}>
                    <Text style={styles.selectedText}>
                      {selectedMachineGroups.map(i => i.MGrpName).join(', ')}
                    </Text>

                    <Icon name="check-circle" size={18} color="#0F6C7B" />
                  </View>
                </>
              )}

              <FlatList
                data={
                  getAllMachineGroups &&
                  getAllMachineGroups.filter(p =>
                    p.MGrpName.toLowerCase().includes(
                      machineGroupSearch.toLowerCase(),
                    ),
                  )
                }
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => {
                  const selected = selectedMachineGroups.some(
                    i => i.MacGrp === item.MacGrp,
                  );

                  return (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() =>
                        toggleSelection(
                          item,
                          selectedMachineGroups,
                          setSelectedMachineGroups,
                          'MacGrp',
                        )
                      }
                    >
                      <Text style={{ flex: 1, color: '#000' }}>
                        {item.MGrpName}
                      </Text>

                      {selected && (
                        <Icon name="check-circle" size={20} color="#0F6C7B" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
            <View style={{ padding: 15 }}>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setMachineGroupPickerVisible(false)}
              >
                <Text style={{ color: '#fff', textAlign: 'center' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {machinesubgroupPickerVisible && (
        <View style={styles.detailOverlay456}>
          <View style={styles.detailContainer}>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
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
                  placeholder="Search machine sub group..."
                  placeholderTextColor="#000"
                  value={machineSubGroupSearch}
                  onChangeText={setMachineSubGroupSearch}
                  style={{ flex: 1, color: '#000' }}
                />
              </View>

              {selectedMachineSubGroups && selectedMachineSubGroups.length > 0 && (
                <>
                  <Text style={styles.section1}>Selected</Text>

                  <View style={styles.selectedBox}>
                    <Text style={styles.selectedText}>
                      {selectedMachineSubGroups &&
                        selectedMachineSubGroups.map(i => i.MSGrpName).join(', ')}
                    </Text>

                    <Icon name="check-circle" size={18} color="#0F6C7B" />
                  </View>
                </>
              )}

              <FlatList
                data={
                  getAllMachineSubGroups &&
                  getAllMachineSubGroups.filter(p =>
                    p.MSGrpName.toLowerCase().includes(
                      machineSubGroupSearch.toLowerCase(),
                    ),
                  )
                }
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => {
                  const selected = selectedMachineSubGroups.some(
                    i => i.MacSGrp === item.MacSGrp,
                  );

                  return (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() =>
                        toggleSelection(
                          item,
                          selectedMachineSubGroups,
                          setSelectedMachineSubGroups,
                          'MacSGrp',
                        )
                      }
                    >
                      <Text style={{ flex: 1, color: '#000' }}>
                        {item.MSGrpName}
                      </Text>

                      {selected && (
                        <Icon name="check-circle" size={20} color="#0F6C7B" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
            <View style={{ padding: 15 }}>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setMachineSubGroupPickerVisible(false)}
              >
                <Text style={{ color: '#fff', textAlign: 'center' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {machinePickerVisible && (
        <View style={styles.detailOverlay456}>
          <View style={styles.detailContainer}>
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
                  placeholder="Search machine..."
                  placeholderTextColor="#000"
                  value={machineSearch}
                  onChangeText={setMachineSearch}
                  style={{ flex: 1, color: '#000' }}
                />
              </View>

              {selectedMachines && selectedMachines.length > 0 && (
                <>
                  <Text style={styles.section1}>Selected</Text>

                  <View style={styles.selectedBox}>
                    <Text style={styles.selectedText}>
                      {selectedMachines &&
                        selectedMachines.map(i => i.MacName).join(', ')}
                    </Text>

                    <Icon name="check-circle" size={18} color="#0F6C7B" />
                  </View>
                </>
              )}

              <FlatList
                data={
                  getAllMachines &&
                  getAllMachines.filter(p =>
                    p.MacName.toLowerCase().includes(
                      machineSearch.toLowerCase(),
                    ),
                  )
                }
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => {
                  const selected = selectedMachines.some(
                    i => i.MacCode === item.MacCode,
                  );

                  return (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() =>
                        toggleSelection(
                          item,
                          selectedMachines,
                          setSelectedMachines,
                          'MacCode',
                        )
                      }
                    >
                      <Text style={{ flex: 1, color: '#000' }}>{item.MacName}</Text>

                      {selected && (
                        <Icon name="check-circle" size={20} color="#0F6C7B" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
            <View style={{ padding: 15 }}>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setMachinePickerVisible(false)}
              >
                <Text style={{ color: '#fff', textAlign: 'center' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {storePickerVisible && (
        <View style={styles.detailOverlay456}>
          <View style={styles.detailContainer}>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setStorePickerVisible(false)}>
                  <Icon name="arrow-back-ios" size={20} color="#000" />
                </TouchableOpacity>

                <Text style={styles.pickerTitle}>Select Store</Text>
                <View style={{ width: 20 }} />
              </View>

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
          </View>
        </View>
      )}

      {yearPickerVisible && (
        <View style={styles.detailOverlay456}>
          <View style={styles.detailContainer}>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setYearPickerVisible(false)}>
                  <Icon name="arrow-back-ios" size={20} color="#000" />
                </TouchableOpacity>

                <Text style={styles.pickerTitle}>Select Year</Text>
                <View style={{ width: 20 }} />
              </View>

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
          </View>
        </View>
      )}

      {propertyPickerVisible && (
        <View style={styles.detailOverlay456}>
          <View style={styles.detailContainer}>
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

              {selectedProperty && (
                <>
                  <Text style={styles.section1}>Selected</Text>

                  <View style={styles.selectedBox}>
                    <Text style={styles.selectedText}>
                      {selectedProperty.LngName}
                    </Text>

                    <Icon name="check-circle" size={18} color="#0F6C7B" />
                  </View>
                </>
              )}

              <FlatList
                data={
                  propertyData &&
                  propertyData.filter(p =>
                    p.LngName.toLowerCase().includes(propertySearch.toLowerCase()),
                  )
                }
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
          </View>
        </View>
      )}

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

  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    margin: 10,
    paddingHorizontal: 10,
    height: 45,
    borderRadius: 10,
  },

  pickerItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },

  //   card: {
  //     backgroundColor: '#fff',
  //     borderRadius: 16,
  //     padding: 14,
  //     marginBottom: 14,
  //     elevation: 4,
  //     shadowColor: '#000',
  //     shadowOpacity: 0.08,
  //     shadowRadius: 6,
  //   },

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

  bigInput: {
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  inputText: { flex: 1, color: '#000' },

  content: {
    flex: 1,
  },

  radioRow: {
    flexDirection: 'row',
    marginTop: 12,
  },

  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#0F6C7B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0F6C7B',
  },

  radioLabel: {
    fontSize: 14,
    color: '#444',
  },

  radioBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },

  radioBoxActive: {
    backgroundColor: '#E0F7FA',
  },
  section1: {
    marginLeft: 10,
    marginBottom: 2,
  },

  newCard: {
    borderRadius: 18,
    marginBottom: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },

  newHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },

  quality: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  newBody: {
    padding: 14,
  },

  machine: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    //textAlign: 'center'
  },

  group: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },

  statBoxLeft: {
    flex: 1,
    backgroundColor: '#F4F7F9',
    padding: 0,
    borderRadius: 12,
    marginHorizontal: 4,
  },

  statBox: {
    flex: 1,
    backgroundColor: '#F4F7F9',
    padding: 0,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },

  statValueRed: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF0000',
  },

  statLabel: {
    fontSize: 11,
    color: '#888',
  },

  footer: {
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingTop: 4,
  },

  footerDate: {
    fontSize: 12,
    color: '#555',
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // 🔥 pushes left & right
    alignItems: 'center',
    marginTop: 5,
  },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // or 'flex-start' if left aligned
    marginTop: 4,
  },

  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F6C7B',
    marginRight: 6,
  },

  subText: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
  },

  subCard: {
    marginTop: 12,
    backgroundColor: '#e9e9e9',
    borderRadius: 14,
    padding: 14,

    // subtle shadow (premium feel)
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },

  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  subTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F6C7B',
  },

  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0F6C7B',
    paddingVertical: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },

  th: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: 10,
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },

  altRow: {
    backgroundColor: '#F8FAFC',
  },

  td: {
    fontSize: 13,
    color: '#111827',
    paddingHorizontal: 10,
  },

  loadingText: {
    textAlign: 'center',
    paddingVertical: 20,
    color: '#666',
  },

  noDataText: {
    textAlign: 'center',
    paddingVertical: 20,
    color: '#999',
  },

  cardLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    borderRadius: 16,
  },

  loadingCardText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F6C7B',
  },

  detailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
    zIndex: 100, // Higher than summary modal
    justifyContent: 'center',
    alignItems: 'center',
  },

  detailOverlay123: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
    zIndex: 200, // Higher than summary modal
    justifyContent: 'center',
    alignItems: 'center',
  },

  detailOverlay456: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
    zIndex: 300, // Higher than summary modal
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Detail Container
  detailContainer: {
    backgroundColor: '#fff',
    // padding: 20,
    paddingTop: 45,
    borderRadius: 10,
    width: '100%',
    height: '100%',
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
