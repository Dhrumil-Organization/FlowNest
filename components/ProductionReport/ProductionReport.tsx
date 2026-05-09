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
  ActivityIndicator,
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
import { Switch } from 'react-native';

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
  //const [selectedMachineGroup, setSelectedMachineGroup] = useState(null);
  const [machineGroupSearch, setMachineGroupSearch] = useState('');

  const [getAllMachineSubGroups, setAllMachineSubGroups] = useState([]);
  const [machinesubgroupPickerVisible, setMachineSubGroupPickerVisible] =
    useState(false);
  //const [selectedMachineSubGroup, setSelectedMachineSubGroup] = useState(null);
  const [machineSubGroupSearch, setMachineSubGroupSearch] = useState('');

  const [getAllMachines, setAllMachines] = useState([]);
  const [machinePickerVisible, setMachinePickerVisible] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machineSearch, setMachineSearch] = useState('');

  const [selectedMachineGroups, setSelectedMachineGroups] = useState([]);
  const [selectedMachineSubGroups, setSelectedMachineSubGroups] = useState([]);
  const [selectedMachines, setSelectedMachines] = useState([]);

  const [getAllProduction, setAllProduction] = useState('1');
  const [getRunningProduction, setRunningProduction] = useState('1');
  const [getCloseProduction, setCloseProduction] = useState('1');

  const [getAllData, setAllData] = useState([]);
  const [getAllInfoData, setAllInfoData] = useState([]);

  const [productionType, setProductionType] = useState('running');
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
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
    const load = async () => {
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
    } else if (productionType == 'close') {
      convertedStatus = '2';
    }
    let status = convertedStatus; // 'all' | 'running' | 'close'

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
        if (
          responsemacgrp.data.response.data &&
          responsemacgrp.data.response.data.length > 0
        ) {
          //   setSelectedMachineGroup(
          //     responsemacgrp.data.response.data[0].MGrpName,
          //   );
          //setSelectedMachineGroup.map(i => i.MGrpName).join(', ');
        }
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
    //let macgrp2 = selectedMachineGroup ? selectedMachineGroup.MacGrp : '';
    let macgrp2 =
      selectedMachineGroups && selectedMachineGroups.length > 0
        ? selectedMachineGroups.map(i => i.MacGrp)
        : [];
    let convertedStatus = '';
    if (productionType == 'all') {
      convertedStatus = '-1';
    } else if (productionType == 'running') {
      convertedStatus = '0';
    } else if (productionType == 'close') {
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

      console.log('macsgrp API payload', payload);
      console.log('macsgrp API URL', `${API}/api/get_criterion`);
      const responsemacsgrp = await axios.get(`${API}/api/get_criterion`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        params: payload,
      });
      console.log('macsgrp API response', responsemacsgrp.data);

      if (
        responsemacsgrp.data.success &&
        responsemacsgrp.data.response.data.length > 0
      ) {
        setAllMachineSubGroups(responsemacsgrp.data.response.data);
        if (
          responsemacsgrp.data.response.data &&
          responsemacsgrp.data.response.data.length > 0
        ) {
          //   setSelectedMachineSubGroups(
          //     responsemacsgrp.data.response.data[0].MSGrpName,
          //   );
          //selectedMachineSubGroups.map(i => i.MSGrpName).join(', ');
        }
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
    //let macgrp3 = selectedMachineGroup ? selectedMachineGroup?.MacGrp : '';
    //let macsgrp3 = selectedMachineSubGroup ? selectedMachineSubGroup?.MacSGrp : '';

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
    } else if (productionType == 'close') {
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

      console.log('machine API payload :', payload);
      console.log('machine API URL :', `${API}/api/get_criterion`);
      const respo = await axios.get(`${API}/api/get_criterion`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        params: payload,
      });

      console.log('machine API response :', respo.data);

      if (respo.data.success && respo.data.response.data.length > 0) {
        setAllMachines(respo.data.response.data);
        if (respo.data.response.data && respo.data.response.data.length > 0) {
          //setSelectedMachine(respo.data.response.data[0].MacName);
          //setSelectedMachine.map(i => i.MacName).join(', ');
        }
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
    // let finalMacGrp = selectedMachineGroup ? selectedMachineGroup?.MacGrp : '';
    // let finalMacSGrp = selectedMachineSubGroup ? selectedMachineSubGroup?.MacSGrp : '';
    // let finalMacCode = selectedMachine ? selectedMachine?.MacCode : '';

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
    let finalfromdate = '';

    let td = '';
    let restd = '';
    let finaltodate = '';

    let convertedStatus = '';
    if (productionType == 'all') {
      convertedStatus = '-1';
    } else if (productionType == 'running') {
      convertedStatus = '0';
    } else if (productionType == 'close') {
      convertedStatus = '2';
    }
    let status = convertedStatus;

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
        productiontype: status,
        action: 'report',
      };

      const headers = {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'X-Requested-with': 'XMLHttpRequest',
      };

      console.log('prodproductionreport API payload : ', payload);
      console.log(
        'prodproductionreport API URL : ',
        `${API}/api/prodproductionreport`,
      );
      try {
        const response = await axios.post(
          `${API}/api/prodproductionreport`,
          payload,
          { headers },
        );

        console.log('prodproductionreport API response : ', response.data);

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

  const getInfoData = async (row = {}) => {
    console.log('row', row);
    console.log('finalPrpCode', finalPrpCode);

    let finalPrpCode = selectedProperty ? selectedProperty?.PrpCode : '';
    let finalYearNo = selectedYear ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
    // let finalMacGrp = selectedMachineGroup ? selectedMachineGroup?.MacGrp : '';
    // let finalMacSGrp = selectedMachineSubGroup ? selectedMachineSubGroup?.MacSGrp : '';
    // let finalMacCode = selectedMachine ? selectedMachine?.MacCode : '';

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
    let finalfromdate = '';

    let td = '';
    let restd = '';
    let finaltodate = '';

    let convertedStatus = '';
    if (productionType == 'all') {
      convertedStatus = '-1';
    } else if (productionType == 'running') {
      convertedStatus = '0';
    } else if (productionType == 'close') {
      convertedStatus = '2';
    }
    let status = convertedStatus;

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

    const headers = {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'X-Requested-with': 'XMLHttpRequest',
    };

    console.log('prodproductionreport API payload : ', payload);
    console.log( 'prodproductionreport API URL : ', `${API}/api/prodproductionreport`, );

    try {
      const response = await axios.post(
        `${API}/api/prodproductionreport`,
        payload,
        { headers },
      );

      console.log('prodproductionreport API response : ', response.data);

      if (response.data.success === true && response.data.data.length === 0) {
        
        showWarning('No Data Found');

        setAllInfoData([]);

        return [];

      } else if ( response.data.success === true && response.data.data.length > 0 ) {

        setAllInfoData(response.data.data);
        
        return response.data.data;

      } else if (response.data.success === false) {

        showWarning(`${response.data.message}`);

        setAllInfoData([]);
        return [];
        
      } else {
        
        showWarning(`${response.data.message}`);

        setAllInfoData([]);
        return [];
      }
    } catch (error) {
      setAllInfoData([]);
      return [];

      Alert.alert('Server Error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (input = '') => {
    // Handle empty, null, undefined, or 0
    if (!input || input === 0) return '';

    const str = String(input);

    // Validate length (must be YYYYMMDD = 8 chars)
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

    console.log('clicked id:', id);
    console.log('expandedId before:', expandedId);

    // toggle close
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setLoadingId(id);

    console.log('Item :', item);
    const result = await getInfoData(item);
    console.log('result :', result);

    setInfoData(prev => ({
      ...prev,
      [id]: result,
    }));

    setLoadingId(null);
    setExpandedId(id);
  };

  //   console.log('-------selectedMachineGroups-----------', selectedMachineGroups);
  //   console.log('-------selectedMachineSubGroups-----------', selectedMachineSubGroups,);
  //   console.log('-------selectedMachines-------------------', selectedMachines);

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
              {/* HEADER */}
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

              {/* BODY */}
              <View style={styles.newBody}>
                {loadingId === String(item.vouno) && (
                  <View style={styles.cardLoader}>
                    <ActivityIndicator size="large" color="#0F6C7B" />
                    <Text style={styles.loadingCardText}>
                      Loading details...
                    </Text>
                  </View>
                )}

                {/* MACHINE */}
                <Text style={styles.machine}>{item.macname}</Text>

                <Text style={styles.group}>
                  GROUP : {item.mgrpname} | SUB GROUP : {item.msgrpname}
                </Text>

                {/* QTY SECTION */}
                <View style={styles.statsRow}>
                  <View style={styles.statBoxLeft}>
                    <Text style={styles.statValue}>{item.prodorderqty}</Text>
                    <Text style={styles.statLabel}>Order</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{item.doffqty}</Text>
                    <Text style={styles.statLabel}>Doff</Text>
                  </View>

                  {/* <View style={styles.statBox}>
                    <Text style={styles.statValue}>{item.packingqty || 0}</Text>
                    <Text style={styles.statLabel}>Packing</Text>
                  </View> */}
                  <View style={styles.statBox}>
                    <View style={styles.valueRow}>
                      <Text style={styles.statValue}>
                        {item.packingqty || 0}
                      </Text>

                      {/* <TouchableOpacity
                        onPress={() =>
                          setExpandedId(
                            expandedId === item.vouno ? null : item.vouno,
                          )
                        }
                      > */}
                      <TouchableOpacity
                        onPress={() => handleInfoPress(item)}
                        //   onPress={async () => {
                        //     const id = item.vouno;

                        //     console.log("expandedId === id :", expandedId,  id)
                        //     if (expandedId === id) {
                        //       setExpandedId(null);
                        //       return;
                        //     }

                        //     setLoadingId(id);

                        //     const result = await getInfoData(item); // 👈 HERE IT IS CALLED

                        //     setInfoData(prev => ({
                        //       ...prev,
                        //       [id]: result,
                        //     }));

                        //     setLoadingId(null);
                        //     setExpandedId(id);
                        //   }}
                      >
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

                {/* FOOTER */}
                <View style={styles.footer}>
                  <Text style={styles.footerDate}>
                    {formatDate(item.voudate)}
                  </Text>
                </View>

                {expandedId === item.vouno && (
                  <View style={styles.subCard}>
                    {/* HEADER */}
                    <View style={styles.subHeader}>
                      <Text style={styles.subTitle}>Grade Details</Text>
                      <Icon name="inventory-2" size={16} color="#0F6C7B" />
                    </View>

                    <View style={styles.divider} />

                    {/* LOADING */}
                    {loadingId === String(item.vouno) ? (
                      <Text style={styles.loadingText}>Loading...</Text>
                    ) : infoData[String(item.vouno)] &&
                      infoData[String(item.vouno)].length > 0 ? (
                      <View>
                        {/* TABLE HEADER */}
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

                        {/* TABLE BODY */}
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

                {/* {expandedId === item.vouno && (
                  <View style={styles.subCard}>
                    
                    <View style={styles.subHeader}>
                      <Text style={styles.subTitle}>Grade Details</Text>
                      <Icon name="inventory-2" size={16} color="#0F6C7B" />
                    </View>

                    
                    <View style={styles.divider} />

                    
                    <View style={styles.subGrid}>
                      <View style={styles.subItem}>
                        <Text style={styles.subLabel}>Order</Text>
                        <Text style={styles.subValue}>{item.prodorderqty}</Text>
                      </View>

                      <View style={styles.subItem}>
                        <Text style={styles.subLabel}>Doff</Text>
                        <Text style={styles.subValue}>{item.doffqty}</Text>
                      </View>

                      <View style={styles.subItem}>
                        <Text style={styles.subLabel}>Packing</Text>
                        <Text style={styles.subValue}>
                          {item.packingqty || 0}
                        </Text>
                      </View>

                      <View style={styles.subItem}>
                        <Text style={styles.subLabel}>Balance</Text>
                        <Text
                          style={[
                            styles.subValue,
                            parseFloat(
                              calcQty(item.prodorderqty, item.packingqty),
                            ) < 0
                              ? styles.negative
                              : styles.positive,
                          ]}
                        >
                          {calcQty(item.prodorderqty, item.packingqty)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )} */}
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

              <Text style={styles.label}>Select type</Text>
              <View style={styles.radioRow}>
                {/* RUNNING */}
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

                {/* ALL */}
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

                {/* CLOSE */}
                <TouchableOpacity
                  style={[
                    styles.radioBox,
                    productionType === 'close' && styles.radioBoxActive,
                  ]}
                  onPress={() => setProductionType('close')}
                >
                  <View style={styles.radioOuter}>
                    {productionType === 'close' && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>Close</Text>
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

          {/* LIST */}
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

          {/* LIST */}
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
                  machineGroupSearch.toLowerCase(),
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
      </Modal>

      {/** store */}
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

      {/** year */}
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

      {/* PROPERTY */}
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

  //   footer: {
  //     //marginTop: 5,
  //     borderTopWidth: 1,
  //     borderColor: '#eee',
  //     paddingTop: 0,
  //   },

  footerText: {
    fontSize: 11,
    color: '#161515',
  },

  footerRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#eee',
    marginTop: 6,
    paddingTop: 6,
  },

  qualityBox: {
    flex: 0.6, // 60%
    paddingRight: 6,
  },

  mergeBox: {
    flex: 0.4, // 40%
    paddingLeft: 6,
  },
  switch: {
    lineHeight: 1,
    marginTop: 10,
  },

  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },

  //   radioOuter: {
  //     width: 18,
  //     height: 18,
  //     borderRadius: 9,
  //     borderWidth: 2,
  //     borderColor: '#0F6C7B',
  //     justifyContent: 'center',
  //     alignItems: 'center',
  //     marginRight: 6,
  //   },

  //   radioInner: {
  //     width: 10,
  //     height: 10,
  //     borderRadius: 5,
  //     backgroundColor: '#0F6C7B',
  //   },

  radioText: {
    fontSize: 14,
    color: '#444',
  },

  radioRow: {
    flexDirection: 'row',
    marginTop: 12,
  },

  //   radioBox: {
  //     flex: 1, // ✅ equal width
  //     flexDirection: 'row',
  //     alignItems: 'center',
  //     justifyContent: 'center', // ✅ center content
  //   },

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

  subText: {
    color: '#E0F7FA',
    fontSize: 12,
    marginTop: 2,
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
    //textAlign: 'center'
  },

  //   statsRow: {
  //     flexDirection: 'row',
  //     justifyContent: 'space-between',
  //     marginTop: 14,
  //   },

  statBoxLeft: {
    flex: 1,
    backgroundColor: '#F4F7F9',
    padding: 0,
    borderRadius: 12,
    //alignItems: 'center',
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

  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F6C7B',
  },
  statValueRed: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF0000',
  },
  statValueGreen: {
    fontSize: 16,
    fontWeight: '600',
    color: '#008000',
  },

  statLabel: {
    fontSize: 11,
    color: '#888',
    //marginTop: 2,
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

  statBoxOne: {
    flex: 1,
    backgroundColor: '#F4F7F9',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  statBoxTwo: {
    flex: 1,
    backgroundColor: '#F4F7F9',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 6, // spacing between 2 boxes
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
    marginRight: 6, // 👈 spacing before icon
  },

  subCard: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F1F8F9',
    borderRadius: 10,
  },

  subTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 6,
    color: '#0F6C7B',
  },

  subText: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
  },

  subCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
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

  subGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  subItem: {
    width: '48%', // 2 column layout
    backgroundColor: '#F6F8FA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },

  subLabel: {
    fontSize: 11,
    color: '#888',
  },

  subValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginTop: 2,
  },

  positive: {
    color: '#2E7D32',
  },

  negative: {
    color: '#D32F2F',
  },

  // subCard: {
  //   marginTop: 12,
  //   backgroundColor: '#F8FAFC',
  //   borderRadius: 12,
  //   padding: 12,
  //   borderWidth: 1,
  //   borderColor: '#E2E8F0',
  // },

  // subHeader: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  // },

  // subTitle: {
  //   fontSize: 15,
  //   fontWeight: '700',
  //   color: '#0F172A',
  // },

  // divider: {
  //   height: 1,
  //   backgroundColor: '#E2E8F0',
  //   marginVertical: 10,
  // },

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
    paddingHorizontal: 8,
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },

  altRow: {
    backgroundColor: '#F9FAFB',
  },

  td: {
    fontSize: 13,
    color: '#111827',
    paddingHorizontal: 8,
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
});
