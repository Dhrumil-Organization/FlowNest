import React, { useState, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
  Switch,
  Alert,
  Dimensions
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import {
  fetchAllPropertyData,
  fetchAllYeardata,
  fetchAllStoredata,
} from '../../common/API/Functions';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import DateTimePicker from '@react-native-community/datetimepicker';
import theme from '@/components/theme';
import HeaderBarwithBack from '@/components/Header';
// import { set } from 'lodash';

const DoffEntry = ({ token, username }) => {
  const [filterVisible, setFilterVisible] = useState(false);
  const [doffAddFormVisible, setDoffAddFormVisible] = useState(false);
  const [doffUpdateFormVisible, setDoffUpdateFormVisible] = useState(false);
  const [formData, setFormData] = useState({
    PrpCode: '',
    YearNo: '',
    StrCode: '',
    MacCode: '',
  });
  const [expanded, setExpanded] = useState(false);
  const [expandedEnd, setExpandedEnd] = useState(false);
  const [getAllPropertyData, setAllPropertyData] = useState([]);
  const [getAllMerData, setAllMerData] = useState([]);
  const [getAllItmData, setAllItmData] = useState([]);
  const [getAllYearData, setAllYearData] = useState([]);
  const [getAllStoreData, setAllStoreData] = useState([]);
  const [txnType, setTxnType] = useState('mobile_doff_entry');

  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
  const [merPickerVisible, setMerPickerVisible] = useState(false);
  const [itmPickerVisible, setItmPickerVisible] = useState(false);

  const [selectedProperty, setSelectedProperty] = useState(null);
  const [propertySearch, setPropertySearch] = useState('');
  const [selectedMer, setSelectedMer] = useState(null);
  const [merSearch, setMerSearch] = useState('');
  const [selectedItm, setSelectedItm] = useState(null);
  const [itmSearch, setItmSearch] = useState('');
  const [recentProps, setRecentProps] = useState([]);
  const [recentPropsmer, setRecentPropsmer] = useState([]);
  const [recentPropsitm, setRecentPropsitm] = useState([]);

  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');

  const [storePickerVisible, setStorePickerVisible] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');

  const [machinePickerVisible, setMachinePickerVisible] = useState(false);
  const [getAllMachines, setAllMachines] = useState([]);
  const [getSelectedFilteredMachine, setSelectedFilteredMachine] = useState([]);
  const [machineSearch, setMachineSearch] = useState('');
  const [selectedMachines, setSelectedMachines] = useState(null);
  const [getAllDoffData, setAllDoffData] = useState([]);
  const [getAllDoffDataNew, setAllDoffDataNew] = useState([]);
  const [macactspeed, setMacactspeed] = useState('');
  const [macspindle, setMacspindle] = useState('');
  const [macactspindle, setMacactspindle] = useState('');
  const [macidlespindle, setMacidlespindle] = useState('');
  const [startreading, setStartreading] = useState('');
  const [tempone, setTempone] = useState('');
  const [temptwo, setTemptwo] = useState('');
  const [tempthree, setTempthree] = useState('');
  const [endTime, setEndTime] = useState(new Date());
  const [totcones, setTotcones] = useState('');
  const [totchees, setTotchees] = useState('');
  const [totgrsqty, setTotgrsqty] = useState('');
  const [tottareqty, setTottareqty] = useState('');
  const [totnetqty, setTotnetqty] = useState('');
  const [endreading, setEndreading] = useState('');
  const [powerconsumption, setPowerconsumption] = useState('');
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [getDate, setDate] = useState(null);
  // For Date Picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  // For Time Picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  // 
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  // 
  const [startDateEnd, setStartDateEnd] = useState(new Date());
  const [startTimeEnd, setStartTimeEnd] = useState(new Date());
  const [showStartDatePickerEnd, setShowStartDatePickerEnd] = useState(false);
  const [showStartTimePickerEnd, setShowStartTimePickerEnd] = useState(false);
  // 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [getValidation, setValidation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [itemToUpdate, setItemToUpdate] = useState(null);
  // 
  const [editableDoffData, setEditableDoffData] = useState({});
  const [netWt, setNetWt] = useState('');
  // 
  const [minDate, setMinDate] = useState(new Date());
  const [maxDate, setMaxDate] = useState(new Date(new Date().getFullYear() + 10, 11, 31)); // Current year + 10 years
  const [pickerVisibility, setPickerVisibility] = useState({});
  // 
  const [hasLastDoff, setHasLastDoff] = useState(false);
  const [isAnyEndEmpty, setIsAnyEndEmpty] = useState(false);
  // 
  const { width } = Dimensions.get('window');
  const [numColumns, setNumColumns] = useState(
    width >= 1200 ? 3 : width >= 600 ? 2 : 1
  );
  const [firstIncompleteDoff, setFirstIncompleteDoff] = useState(null);

  const parseProductionDate = (proddate) => {
    if (!proddate || proddate.length !== 8) return null;
    const year = parseInt(proddate.substring(0, 4), 10);
    const month = parseInt(proddate.substring(4, 6), 10) - 1; // Months are 0-indexed
    const day = parseInt(proddate.substring(6, 8), 10);
    return new Date(year, month, day);
  };

  const validateStartDateTime = (date, time, proddate) => {
    const productionDate = parseProductionDate(proddate);
    if (!productionDate) return { valid: true, message: '' }; // No production date to compare

    const selectedDateTime = combineDateTime(date, time);
    if (selectedDateTime < productionDate) {
      return {
        valid: false,
        message: `Date and time cannot be earlier than the production date (${getDisplayDateFromYYYYMMDD(proddate)})`
      };
    }
    return { valid: true, message: '' };
  };

  // Add this useEffect to handle orientation changes
  useEffect(() => {
    const onChange = ({ window }) => {
      setNumColumns(window.width >= 1200 ? 3 : window.width >= 600 ? 2 : 1);
    };

    // Add event listener
    Dimensions.addEventListener('change', onChange);

    // Cleanup function to remove the listener
    return () => {
      Dimensions.removeEventListener?.('change', onChange);
    };
  }, []);

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

  const showPicker = (doffId, field) => {
    setPickerVisibility(prev => ({
      ...prev,
      [doffId]: { ...prev[doffId], [field]: true }
    }));
  };

  const hidePicker = (doffId, field) => {
    setPickerVisibility(prev => ({
      ...prev,
      [doffId]: { ...prev[doffId], [field]: false }
    }));
  };

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const data = await fetchAllPropertyData(token);
      setAllPropertyData(data);

      // if (data?.length) setAllPropertyData(data);
      // Set the first property as selected by default
      if (data && data.length > 0) {
        setSelectedProperty(data[0]);
      }
    };

    setTimeout(() => {
      load();
    }, 2000);
  }, [token]);

  useEffect(() => {
    if (getAllDoffData.length > 0) {
      const initialData = {};
      getAllDoffData.forEach((item, index) => {
        const doffId = item.uid || index;
        initialData[doffId] = {
          startreading: item.startreading || '',
          endreading: item.endreading || '',
          startdate: item.startdate || '',   // Already YYYYMMDD from API
          starttime: item.starttime || '',
          enddate: item.enddate || '',
          endtime: item.endtime || '',
          totcones: item.totcones || '',  // Add this
          totchees: item.totchees || '',  // Add this
          totnetqty: item.totnetqty || '',  // Add this
          tottareqty: item.tottareqty || '',  // Add this
          totgrsqty: item.totgrsqty || '',  // Add this
          islastdoff: item.islastdoff || '0',
        };
      });
      setEditableDoffData(initialData);
      if (getAllDoffData.length > 1) {

      }
    }
  }, [getAllDoffData]);

  // useEffect(() => {
  //   if (getAllDoffData.length > 0) {
  //     // Check if any item has islastdoff set to '1', 1, or true
  //     const anyLastDoff = getAllDoffData.some(item => {
  //       return item.islastdoff === '1' || item.islastdoff === 1 || item.islastdoff === true;
  //     });
  //     setHasLastDoff(anyLastDoff);
  //   } else {
  //     setHasLastDoff(false); // Reset if no data
  //   }
  // }, [getAllDoffData]);
  const proddate = getSelectedFilteredMachine[0]?.proddate;
  const productionDate = parseProductionDate(proddate);
  console.log('Proddate:', proddate);
  console.log('Production Date Object:', productionDate);
  console.log('Production Date Type:', typeof productionDate);
  console.log('Production Date Instance:', productionDate instanceof Date);
  console.log(
    'dddate :', productionDate, proddate
  )
  useEffect(() => {
    if (getAllDoffData.length > 0) {
      // Check for anyLastDoff
      const anyLastDoff = getAllDoffData.some(item => {
        return item.islastdoff === '1' || item.islastdoff === 1 || item.islastdoff === true;
      });
      setHasLastDoff(anyLastDoff);

      // Check for anyEndEmpty
      const anyEndEmpty = getAllDoffData.some(item => {
        return !item.enddate || !item.endtime;
      });
      setIsAnyEndEmpty(anyEndEmpty);
      // Find the first item with empty enddate or endtime
      const incompleteDoff = getAllDoffData.find(item => {
        return !item.enddate || !item.endtime;
      });

      setFirstIncompleteDoff(incompleteDoff);
      console.log('First incomplete Doff:', incompleteDoff); // Log the first incomplete 
    } else {
      setHasLastDoff(false);
      setIsAnyEndEmpty(false);
      setFirstIncompleteDoff(null);
    }
  }, [getAllDoffData]);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    setMinDate(new Date(currentYear, 0, 1)); // Jan 1 of current year
    setMaxDate(new Date(currentYear + 10, 11, 31)); // Dec 31 of current year + 10
  }, []);

  useEffect(() => {
    if (!token) return;
    if (
      typeof selectedProperty != 'undefined' &&
      selectedProperty != null &&
      selectedProperty != '' &&
      Object.keys(selectedProperty).length > 0
    ) {
      const yearFunc = async () => {
        const allyeardata = await fetchAllYeardata(token, formData.PrpCode);

        setAllYearData(allyeardata);
        // Select the first year by default
        if (allyeardata && allyeardata.length > 0) {
          setSelectedYear(allyeardata[0].YearName);
        }
      };

      yearFunc();
    }
  }, [selectedProperty, token]);

  useEffect(() => {
    if (selectedMachines) {
      // Extract MacName from selectedMachines (assuming it's an object or array)
      const selectedMacNames = Array.isArray(selectedMachines)
        ? selectedMachines.map(machine => machine.MacName)
        : [selectedMachines.MacName];

      // Filter getAllMachines to find matching MacName(s)
      const matchedMachines = getAllMachines.filter(machine =>
        selectedMacNames.includes(machine.MacName)
      );

      console.log("Filtered Machines:", matchedMachines);
      setSelectedFilteredMachine(matchedMachines);
    }
  }, [selectedMachines]);

  console.log("getSelectedFilteredMachine:", getSelectedFilteredMachine, selectedMachines);

  useEffect(() => {
    if (!token) return;
    if (
      typeof selectedYear != 'undefined' &&
      selectedYear != null &&
      selectedYear != '' &&
      Object.keys(selectedYear).length > 0
    ) {
      let prp = '';
      let yr = '';

      if (Object.keys(selectedProperty).length > 0) {
        prp = selectedProperty.PrpCode;
      }

      if (Object.keys(selectedYear).length > 0) {
        yr = selectedYear.YearNo;
      }
      console.log("Store Call prp:", prp, "yr:", yr);

      const storeFunc = async () => {
        const allstoredata = await fetchAllStoredata(token, prp, yr, txnType);

        setAllStoreData(allstoredata);
        // Select the first store by default
        if (allstoredata && allstoredata.length > 0) {
          setSelectedStore(allstoredata[0]);
        }
      };

      storeFunc();
    }
  }, [selectedYear, selectProperty, selectedProperty, token]);

  useEffect(() => {
    if (!token) return;
    getMergeData();
    const MergeFunc = async () => {

      // Select the first year by default
      if (getAllMerData && getAllMerData.length > 0) {
        setSelectedMer(getAllMerData[0]);
      }
    };

    MergeFunc();


  }, [selectedYear, selectProperty, selectedProperty, selectedStore, token]);

  useEffect(() => {
    if (!token) return;
    getItmData();
    const ItemFunc = async () => {

      // Select the first year by default
      if (getAllItmData && getAllItmData.length > 0) {
        setSelectedItm(getAllItmData[0]);
      }
    };

    ItemFunc();


  }, [selectedYear, selectProperty, selectedProperty, selectedStore, selectedMer, token]);

  useEffect(() => {
    if (!token) return;
    getMachineData();
    const MacFunc = async () => {

      // Select the first year by default
      if (getAllMachines && getAllMachines.length > 0) {
        setSelectedMachines(getAllMachines[0]);
      }
    };

    MacFunc();


  }, [selectedYear, selectProperty, selectedProperty, selectedStore, selectedMer, selectedItm, token]);

  // Display date from YYYYMMDD string as DD/MM/YYYY
  const getDisplayDateFromYYYYMMDD = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return '-';
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  };

  // Helper function for date formatting dd/mm/yyyy
  const formatDateDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper function for time formatting 17.00
  const formatTimeWithDot = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}.${minutes}`;
  };

  // Helper function to combine date and time
  const combineDateTime = (date, time) => {
    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return combined;
  };

  const selectProperty = item => {
    setSelectedProperty(item);
    setSelectedStore('');
    // setSelectedYear('');
    setSelectedMer(null);
    setSelectedItm(null);
    setSelectedMachines(null);
    setAllMerData([]);
    setAllItmData([]);
    setAllMachines([]);

    const updated = [
      item,
      ...recentProps.filter(p => p.PrpCode !== item.PrpCode),
    ];
    setRecentProps(updated.slice(0, 3));
  };

  const selectMerge = item => {
    setSelectedMer(item);
    setSelectedItm(null);
    setSelectedMachines(null);
    setAllItmData([]);
    setAllMachines([]);

    const updated = [
      item,
      ...recentPropsmer.filter(p => p.mercode !== item.mercode),
    ];
    setRecentPropsmer(updated.slice(0, 3));
  };

  const selectItem = item => {
    setSelectedItm(item);

    const updated = [
      item,
      ...recentPropsitm.filter(p => p.itmcode !== item.itmcode),
    ];
    setRecentPropsitm(updated.slice(0, 3));
  };

  const getMergeData = async () => {
    let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
    let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';

    // if (typeof prp3 == 'undefined' || prp3 == null || prp3 == '') {
    //   showWarning('Please select property');
    //   return;
    // } else if (
    //   typeof yearnumber3 == 'undefined' ||
    //   yearnumber3 == null ||
    //   yearnumber3 == ''
    // ) {
    //   showWarning('Please select yaer');
    //   return;
    // } else if (
    //   typeof finalStrCode == 'undefined' ||
    //   finalStrCode == null ||
    //   finalStrCode == ''
    // ) {
    //   showWarning('Please select store');
    //   return;
    // }

    try {
      const payload = {
        fetch: 'mer',
        txntype: 'mobile_doff_entry',
        prptype: '',
        prpcode: prp3,
        yearno: yearnumber3,
        strcode: finalStrCode,
        limit: '',
      };
      const respo = await axios.get(`${API}/api/get_criterion`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        params: payload,
      });
      console.log("merge respo:", respo, payload);

      if (respo.data.success && respo.data.response.data.length > 0) {
        console.log('merge API success:', respo);
        setAllMerData(respo.data.response.data);
        setSelectedMer(respo.data.response.data[0]);
      } else {
        console.log('merge API success false:', respo?.data);
      }
    } catch (error) {
      console.log('merge api error:', error);
    }

    // setMerPickerVisible(true);
  };

  const getItmData = async () => {
    let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
    let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
    let finalmerCode = selectedMer ? selectedMer?.mercode : '';

    // if (typeof prp3 == 'undefined' || prp3 == null || prp3 == '') {
    //   showWarning('Please select property');
    //   return;
    // } else if (
    //   typeof yearnumber3 == 'undefined' ||
    //   yearnumber3 == null ||
    //   yearnumber3 == ''
    // ) {
    //   showWarning('Please select yaer');
    //   return;
    // } else if (
    //   typeof finalStrCode == 'undefined' ||
    //   finalStrCode == null ||
    //   finalStrCode == ''
    // ) {
    //   showWarning('Please select store');
    //   return;
    // } else if (
    //   typeof finalmerCode == 'undefined' ||
    //   finalmerCode == null ||
    //   finalmerCode == ''
    // ) {
    //   showWarning('Please select Merge');
    //   return;
    // }

    try {
      const payload = {
        fetch: 'itm',
        txntype: 'mobile_doff_entry',
        prptype: '',
        prpcode: prp3,
        yearno: yearnumber3,
        strcode: finalStrCode,
        mercode: finalmerCode,
        limit: '',
      };
      const respo = await axios.get(`${API}/api/get_criterion`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        params: payload,
      });
      console.log("itm respo:", respo);

      if (respo.data.success && respo.data.response.data.length > 0) {
        console.log('itm API success:', respo);
        setAllItmData(respo.data.response.data);
        setSelectedItm(respo.data.response.data[0]);
      } else {
        console.log('itm API success false:', respo?.data);
      }
    } catch (error) {
      console.log('itm api error:', error);
    }

    // setItmPickerVisible(true);
  };

  const getMachineData = async () => {
    let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
    let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
    let finalmerCode = selectedMer ? selectedMer?.mercode : '';
    let finalitmCode = selectedItm ? selectedItm?.itmcode : '';

    // if (typeof prp3 == 'undefined' || prp3 == null || prp3 == '') {
    //   showWarning('Please select property');
    //   return;
    // } else if (
    //   typeof yearnumber3 == 'undefined' ||
    //   yearnumber3 == null ||
    //   yearnumber3 == ''
    // ) {
    //   showWarning('Please select yaer');
    //   return;
    // } else if (
    //   typeof finalStrCode == 'undefined' ||
    //   finalStrCode == null ||
    //   finalStrCode == ''
    // ) {
    //   showWarning('Please select store');
    //   return;
    // }

    try {
      const payload = {
        fetch: 'machine',
        txntype: 'mobile_doff_entry',
        prptype: '',
        prpcode: prp3,
        yearno: yearnumber3,
        strcode: finalStrCode,
        mercode: finalmerCode,
        itmcode: finalitmCode,
        limit: '',
      };
      const respo = await axios.get(`${API}/api/get_criterion`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        params: payload,
      });
      console.log("mac respo:", respo, payload);

      if (respo.data.success && respo.data.response.data.length > 0) {
        console.log('machine API success:', respo);
        setAllMachines(respo.data.response.data);
        setSelectedMachines(respo.data.response.data[0]);
      } else {
        console.log('machine API success false:', respo?.data);
      }
    } catch (error) {
      console.log('machine api error:', error);
    }

    // setMachinePickerVisible(true);
  };

  const showData = async (selectedMachines) => {
    let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
    let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
    let finalMacCode = selectedMachines?.MacCode || '';
    let finalmerCode = selectedMer ? selectedMer?.mercode : '';
    let finalitmCode = selectedItm ? selectedItm?.itmcode : '';

    if (typeof prp3 == 'undefined' || prp3 == '' || prp3 == null) {
      showWarning('please select property');
    } else if (
      typeof yearnumber3 == 'undefined' ||
      yearnumber3 == null ||
      yearnumber3 == ''
    ) {
      showWarning('please select year');
    } else if (
      typeof finalStrCode == 'undefined' ||
      finalStrCode == null ||
      finalStrCode == ''
    ) {
      showWarning('please select store');
    } else if (
      typeof finalMacCode == 'undefined' ||
      finalMacCode == null ||
      finalMacCode == ''
    ) {
      showWarning('please select machine');
    } else {
      try {
        const payload = {
          txntype: 'mobile_doff_entry',
          prptype: '',
          prpcode: prp3,
          yearno: yearnumber3,
          strcode: finalStrCode,
          limit: '',
          maccode: finalMacCode,
          mercode: finalmerCode,
          itmcode: finalitmCode,
          productionuid: selectedMachines?.productionuid || '',
        };
        const respo = await axios.get(`${API}/api/proddoffshow`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          params: payload,
        });
        console.log('proddoffshow api response : ', respo.data.data, payload);
        if (respo.data.success) {
          setFilterVisible(false);
          console.log('proddoffshow api response : ', respo);
          setAllDoffData(respo.data.data.main);
          console.log('proddoffshow api response new: ', respo.data.data.mainnew);
          setAllDoffDataNew(respo.data.data.mainnew);
        } else {
          console.log('API response issue:', respo.data);
        }
      } catch (error) {
        console.log('Machine Change API Error =>', error);
      }
    }

    // setFilterVisible(false);
  };

  const createMergedPayload = (firstData, secondData) => {
    // Check if data exists
    if (!firstData || !firstData[0]) {
      return {};
    }
    console.log('firstData', firstData, 'secondData', secondData);

    // First data se base object lo
    const firstObject = firstData[0];
    const secondObject = secondData && secondData[0] ? secondData[0] : {};

    // Second object ki saari keys ko lowercase mein convert karo
    const normalizedSecondObject = {};
    for (const key in secondObject) {
      normalizedSecondObject[key.toLowerCase()] = secondObject[key];
    }

    // Result object banaye
    const result = {};

    // Helper function to check if value is NOT null/undefined (empty string "" is considered VALID for priority)
    const isNotNullOrUndefined = (value) => {
      return value !== null && value !== undefined;
    };

    // Helper function to check if value has actual content (not null, not undefined, not empty string)
    const hasActualValue = (value) => {
      return value !== null && value !== undefined && value !== '';
    };

    // First object ki saari keys pe loop
    for (const key in firstObject) {
      const firstValue = firstObject[key];
      const lowerKey = key.toLowerCase();
      const secondValue = normalizedSecondObject[lowerKey];

      // Priority Logic:
      // 1. Agar first ki value actual hai (not null, not undefined, not empty) → first lega
      if (hasActualValue(firstValue)) {
        result[key] = firstValue;
      }
      // 2. Agar first ki value null/undefined hai AND second ki value not null/undefined (including empty string) → second lega
      else if (!isNotNullOrUndefined(firstValue) && isNotNullOrUndefined(secondValue)) {
        result[key] = secondValue;
      }
      // 3. Agar first ki value empty string "" hai → first lega (empty string priority over null)
      else if (firstValue === '') {
        result[key] = firstValue;
      }
      // 4. Agar first ki value null/undefined hai AND second ki bhi null/undefined hai → first lega (null)
      else {
        result[key] = firstValue;
      }
    }

    return result;
  };


  // Aur final payload mein daaldo:
  const doffAdd = async () => {

    const proddate = getSelectedFilteredMachine[0]?.proddate;
    const validation = validateStartDateTime(startDate, startTime, proddate);
    if (!validation.valid) {
      showWarning(validation.message);
      return; // Stop execution if validation fails
    }
    // Merged payload create karo
    const mergedPayload = createMergedPayload(getAllDoffDataNew, getSelectedFilteredMachine);

    // Format date and time
    const formattedStartDate = formatDateDDMMYYYY(startDate);
    const formattedStartTime = formatTimeWithDot(startTime);
    const combinedDateTime = combineDateTime(startDate, startTime);
    let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
    let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
    let finalmerCode = selectedMer ? selectedMer?.mercode : '';
    let finalitmCode = selectedItm ? selectedItm?.itmcode : '';
    // Final payload
    const finalPayload = {
      ...mergedPayload,
      // totcones: mergedPayload.totchees || 0,
      // tottareqty: mergedPayload.tottareqty.toString() || 0,  // Add this
      startdate: formattedStartDate,
      starttime: formattedStartTime,
      startdatetime: combinedDateTime.toISOString(),
      shfcode: '0',
      d1: [],
      d2: [],
      prpcode: prp3,
      yearno: yearnumber3,
      strcode: finalStrCode,
      mercode: finalmerCode,
      itmcode: finalitmCode,
      txntype: 'mobile_doff_entry'
    };
    console.log('📤 doff Add PAYLOAD:', finalPayload);
    // Only add machine fields if they are not already in mergedPayload
    if (getSelectedFilteredMachine && getSelectedFilteredMachine[0]) {
      const machine = getSelectedFilteredMachine[0];

      // Sirf wahi fields add karo jo mergedPayload mein null/empty hain
      // if (!finalPayload.maccode) finalPayload.maccode = machine.MacCode || null;
      // if (!finalPayload.macname) finalPayload.macname = machine.MacName || null;
      // if (!finalPayload.macspeed) finalPayload.macspeed = machine.MacSpeed || null;
      // if (!finalPayload.macspindle) finalPayload.macspindle = machine.MacSpindle || null;
      // if (!finalPayload.powerconsumption) finalPayload.powerconsumption = machine.powerconsumption || null;
    }



    try {
      const response = await axios.post(
        `${API}/api/proddoffadd`,
        finalPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📥 Doff add RESPONSE:', finalPayload, response.data);

      if (response.data.success) {
        const data = response.data.data.main;
        showSuccess('Doff added successfully');
        setAllDoffData(data);
        setAllDoffDataNew(response.data.data.mainnew);
      } else {
        showWarning(response.data.message || 'Failed to add doff');
      }

    } catch (error) {
      console.log('❌ API Error:', error);
      showError('API failed: ' + (error.response?.data?.message || error.message));
    }
  };


  const doffUpdateEnd = async () => {
    const proddate = getSelectedFilteredMachine[0]?.proddate;
    const validation = validateStartDateTime(startDateEnd, startTimeEnd, proddate);
    if (!validation.valid) {
      showWarning(validation.message);
      return; // Stop execution if validation fails
    }
    // Merged payload create karo
    let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
    let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
    let finalmerCode = selectedMer ? selectedMer?.mercode : '';
    let finalitmCode = selectedItm ? selectedItm?.itmcode : '';
    const formattedStartDateEnd = formatDateDDMMYYYY(startDateEnd);
    const formattedStartTimeEnd = formatTimeWithDot(startTimeEnd);

    // Get the latest edited data for this doff
    const doffId = firstIncompleteDoff.uid || getAllDoffData.indexOf(firstIncompleteDoff);
    const latestEditedData = editableDoffData[doffId] || {};

    try {


      // Prepare the payload with the latest edited data
      const finalPayload = {
        prpcode: prp3,
        yearno: yearnumber3,
        strcode: finalStrCode,
        mercode: finalmerCode,
        itmcode: finalitmCode,
        txntype: 'mobile_doff_entry',
        maccode: firstIncompleteDoff?.maccode,
        uid: firstIncompleteDoff?.uid,
        productionuid: firstIncompleteDoff?.productionuid,
        // Use the latest edited data
        startdate: firstIncompleteDoff.startdate,
        starttime: firstIncompleteDoff.starttime,
        // enddate: firstIncompleteDoff.enddate,
        // endtime: firstIncompleteDoff.endtime,
        // enddate: latestEditedData.enddate || itemToUpdate.enddate,
        // endtime: latestEditedData.endtime || itemToUpdate.endtime,
        enddate: formattedStartDateEnd,
        endtime: formattedStartTimeEnd,

        startreading: firstIncompleteDoff.startreading,
        endreading: firstIncompleteDoff.endreading,
        totcones: firstIncompleteDoff.totchees,  // Add this
        totchees: firstIncompleteDoff.totchees,  // Add this
        totnetqty: firstIncompleteDoff.totnetqty,  // Add this
        totgrsqty: firstIncompleteDoff.totgrsqty,  // Add this
        islastdoff: firstIncompleteDoff.islastdoff,  // Add this
        tottareqty: firstIncompleteDoff.tottareqty,  // Add this
        // tottareqty: isNaN(
        //   (parseFloat(firstIncompleteDoff.totchees) || 0) *
        //   (parseFloat(firstIncompleteDoff.coneweight) || 0)
        // )
        //   ? "0"
        //   : (
        //     (parseFloat(firstIncompleteDoff.totchees) || 0) *
        //     (parseFloat(firstIncompleteDoff.coneweight) || 0)
        //   ).toString(),
        d1: [],
        d2: [],
        // Include all other fields from the original firstIncompleteDoff
        ...Object.fromEntries(
          Object.entries(firstIncompleteDoff).filter(([key]) =>
            !['enddate', 'endtime', 'totcones', 'tottareqty'].includes(key)
          )
        )
      };

      console.log('📤 doff End Update PAYLOAD:', finalPayload);

      const response = await axios.post(
        `${API}/api/proddoffedit`,
        finalPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📤 doff End  Update response:', response);

      if (response.data.success) {
        const data = response.data.data.main;
        showSuccess('Doff updated successfully');
        setAllDoffData(data);
        setAllDoffDataNew(response.data.data.mainnew);
        // Clear the editable data for this doff after successful update
        setEditableDoffData(prev => {
          const newData = { ...prev };
          delete newData[doffId];
          return newData;
        });
      } else {
        showWarning(response.data.message || 'Failed to update doff');
      }
    } catch (error) {
      console.log('❌ API Error:', error);
      showError('API failed: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDoffDelete = (item) => {
    setItemToDelete(item); // Store the item to delete
    setShowDeleteConfirm(true); // Show confirmation modal
  };

  const handleDoffUpdate = (item, validation = false) => {
    setItemToUpdate(item); // Store the item to delete
    setShowUpdateConfirm(true); // Show confirmation modal
    setValidation(validation);
  };
  console.log('===getAllDoffData===', getAllDoffDataNew, getSelectedFilteredMachine);
  // const (editableDoffData[selectedDoffId] || {}) =
  //   editableDoffData[selectedDoffId] || {};

  const calculateSums = () => {
    const sums = {
      totcones: 0,
      totchees: 0,
      totgrsqty: 0,
      tottareqty: 0,
      totnetqty: 0,
    };

    getAllDoffData.forEach(item => {
      sums.totcones += parseFloat(item.totcones || 0);
      sums.totnetqty += parseFloat(item.totnetqty || 0);
      sums.totchees += parseFloat(item.totchees || 0);
    });

    return sums;
  };

  const sums = calculateSums();


  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Doff Entry'}
        subHeader={'Manage your doff records'}
        noBorderRadius={true}
        breadcrumb={'Doff Entry'}
        SearchBar={false}
      />
      <TouchableOpacity style={styles.listIconContainer} onPress={() => setFilterVisible(true)}>
        <Icon name="list" size={20} color="#fff" />
      </TouchableOpacity>
      <View style={{ flex: 1, backgroundColor: '#F5F7FB' }}>
        {getAllDoffData && getAllDoffData.length > 0 || selectedProperty?.PrpCode ? (
          <>
            {/* Machine Info Card (Compact) */}
            <View style={styles.machineInfoCard}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.machineInfoScroll}
              >
                <View style={styles.machineInfoRow}>
                  <Text style={styles.machineInfoLabel}>M/C:</Text>
                  <Text style={styles.machineInfoValue}>
                    {getSelectedFilteredMachine[0]?.MacName || 'N/A'}
                  </Text>
                </View>
                <View style={{ width: 2, borderWidth: 1, borderColor: '#ccc', height: '100%' }}></View>
                <View style={styles.machineInfoRow}>
                  <Text style={styles.machineInfoLabel}>Qlty:</Text>
                  <Text style={styles.machineInfoValue}>
                    {getSelectedFilteredMachine[0]?.itmname || 'N/A'}
                  </Text>
                </View>
                <View style={{ width: 2, borderWidth: 1, borderColor: '#ccc', height: '100%' }}></View>
                <View style={styles.machineInfoRow}>
                  <Text style={styles.machineInfoLabel}>Mer:</Text>
                  <Text style={styles.machineInfoValue}>
                    {getSelectedFilteredMachine[0]?.mername || 'N/A'}
                  </Text>
                </View>
                <View style={{ width: 2, borderWidth: 1, borderColor: '#ccc', height: '100%' }}></View>
                <View style={styles.machineInfoRow}>
                  <Text style={styles.machineInfoLabel}>Shd:</Text>
                  <Text style={styles.machineInfoValue}>
                    {getSelectedFilteredMachine[0]?.shade || 'N/A'}
                  </Text>
                </View>
              </ScrollView>
            </View>
            <View style={styles.machineInfoCardNew}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.machineInfoScroll}
              >
                <View style={styles.machineInfoRow}>
                  <Text style={styles.machineInfoLabel}>R.C. No:</Text>
                  <Text style={styles.machineInfoValue}>
                    {getSelectedFilteredMachine[0]?.prodno || 'N/A'}
                  </Text>
                </View>
                <View style={{ width: 2, borderWidth: 1, borderColor: '#ccc', height: '100%' }}></View>
                <View style={styles.machineInfoRow}>
                  <Text style={styles.machineInfoLabel}>R.C. Date:</Text>
                  <Text style={styles.machineInfoValue}>
                    {getSelectedFilteredMachine[0]?.proddate ? getDisplayDateFromYYYYMMDD(getSelectedFilteredMachine[0]?.proddate) : 'N/A'}
                  </Text>
                </View>
                <View style={{ width: 2, borderWidth: 1, borderColor: '#ccc', height: '100%' }}></View>
                <View style={styles.machineInfoRow}>
                  <Text style={styles.machineInfoLabel}>Qty:</Text>
                  <Text style={styles.machineInfoValue}>
                    {getSelectedFilteredMachine[0]?.prodqty ? Number(getSelectedFilteredMachine[0]?.prodqty).toFixed(3) : 'N/A'}
                  </Text>
                </View>
              </ScrollView>
            </View>
            <View style={styles.machineInfoCardNew}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.machineInfoScroll}
              >
                <View style={styles.machineInfoRow}>
                  <Text style={styles.machineInfoLabel}>Total Chees:</Text>
                  <Text style={styles.machineInfoValue}>
                    {sums.totchees.toFixed(2)}
                  </Text>
                </View>
                <View style={{ width: 2, borderWidth: 1, borderColor: '#ccc', height: '100%' }}></View>
                <View style={styles.machineInfoRow}>
                  <Text style={styles.machineInfoLabel}>Total Net Wt.:</Text>
                  <Text style={styles.machineInfoValue}>
                    {sums.totnetqty.toFixed(3)}
                  </Text>
                </View>
              </ScrollView>
            </View>
            {/* <View style={styles.summaryCard}>
              
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Tubes:</Text>
                  <Text style={styles.summaryValue}>{sums.totcones.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Net Wt.:</Text>
                  <Text style={styles.summaryValue}>{sums.totnetqty.toFixed(2)}</Text>
                </View>
              </View>
            </View> */}
            <View style={styles.accordionContainer}>
              {hasLastDoff ? (null) :
                <TouchableOpacity
                  style={styles.accordionHeader}
                  activeOpacity={0.8}
                  onPress={() => setExpanded(!expanded)}
                >
                  <Text style={styles.accordionTitle}>Start Doff</Text>
                  <Icon
                    name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={24}
                    color="#fff"
                  />
                </TouchableOpacity>
              }
              {hasLastDoff ? (null) :
                <>

                  {expanded && (
                    <View style={styles.accordionContent}>
                      {/* Date & Time Picker Section */}
                      <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Start Date & Time</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          {/* Date Picker Button */}
                          <TouchableOpacity
                            style={styles.dateTimeInput}
                            onPress={() => setShowStartDatePicker(true)}
                          >
                            <Icon name="date-range" size={20} color="#666" />
                            <Text style={styles.dateTimeText}>
                              {formatDateDDMMYYYY(startDate)}
                            </Text>
                          </TouchableOpacity>

                          {/* Time Picker Button */}
                          <TouchableOpacity
                            style={styles.dateTimeInput}
                            onPress={() => setShowStartTimePicker(true)}
                          >
                            <Icon name="schedule" size={20} color="#666" />
                            <Text style={styles.dateTimeText}>
                              {formatTimeWithDot(startTime)}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Date Picker Modal */}
                      {/* {showStartDatePicker && (
                        <DateTimePicker
                          value={startDate}
                          mode="date"
                          display="default"
                          // onChange={(event, date) => {
                          //   setShowStartDatePicker(false);
                          //   if (event.type === 'set' && date) {
                          //     setStartDate(date);
                          //   }
                          // }}
                          onChange={(event, date) => {
                            setShowStartDatePicker(false);
                            if (event.type === 'set' && date) {
                              const proddate = getSelectedFilteredMachine[0]?.proddate;
                              const productionDate = parseProductionDate(proddate);
                              if (productionDate && date < productionDate) {
                                showWarning(`Start date cannot be earlier than ${getDisplayDateFromYYYYMMDD(proddate)}`);
                                return;
                              }
                              setStartDate(date);
                            }
                          }}
                          minimumDate={parseProductionDate(getSelectedFilteredMachine[0]?.proddate) || new Date()}
                          // minimumDate={new Date()}
                          textColor="#000"
                          locale="en-IN"
                        />
                      )} */}
                      {showStartDatePicker && (
                        <DateTimePicker
                          value={startDate}
                          mode="date"
                          display="default"
                          onChange={(event, date) => {
                            setShowStartDatePicker(false);
                            if (event.type === 'set' && date) {
                              const proddate = getSelectedFilteredMachine[0]?.proddate;
                              const productionDate = parseProductionDate(proddate);
                              if (productionDate && date < productionDate) {
                                showWarning(`Start date cannot be earlier than ${getDisplayDateFromYYYYMMDD(proddate)}`);
                                return;
                              }
                              setStartDate(date);
                            }
                          }}
                          minimumDate={parseProductionDate(getSelectedFilteredMachine[0]?.proddate) || new Date()}
                          textColor="#000"
                          locale="en-IN"
                        />
                      )}

                      {/* Time Picker Modal */}
                      {showStartTimePicker && (
                        <DateTimePicker
                          value={startTime}
                          mode="time"
                          display="default"
                          is24Hour={true}
                          onChange={(event, time) => {
                            setShowStartTimePicker(false);
                            if (event.type === 'set' && time) {
                              setStartTime(time);
                            }
                          }}
                          textColor="#000"
                          locale="en-IN"
                        />
                      )}

                      {/* Save Button */}
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={() => {
                          if (!getSelectedFilteredMachine[0]) {
                            showWarning("Please select a machine first");
                            return;
                          }
                          console.log(
                            "Selected Machine Data:",
                            getSelectedFilteredMachine[0],
                            "Start Date:",
                            selectedDate || new Date(),
                            "Start Time:",
                            selectedTime || new Date(),
                            "Combined DateTime:",
                            getDate || new Date()
                          );
                          doffAdd();
                        }}
                      >
                        <Text style={styles.saveButtonText}>START</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              }
            </View>
            <View style={styles.accordionContainer}>
              {hasLastDoff ? (null) :
                isAnyEndEmpty ?
                  <>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      activeOpacity={0.8}
                      onPress={() => setExpandedEnd(!expandedEnd)}
                    >
                      <Text style={styles.accordionTitle}>End Doff</Text>
                      <Icon
                        name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={24}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </>
                  : null
              }

              {hasLastDoff ? (null) :
                isAnyEndEmpty ?
                  <>
                    {expandedEnd && (
                      <View style={styles.accordionContent}>
                        {/* Date & Time Picker Section */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.label}>End Date & Time</Text>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            {/* Date Picker Button */}
                            <TouchableOpacity
                              style={styles.dateTimeInput}
                              onPress={() => setShowStartDatePickerEnd(true)}
                            >
                              <Icon name="date-range" size={20} color="#666" />
                              <Text style={styles.dateTimeText}>
                                {formatDateDDMMYYYY(startDate)}
                              </Text>
                            </TouchableOpacity>

                            {/* Time Picker Button */}
                            <TouchableOpacity
                              style={styles.dateTimeInput}
                              onPress={() => setShowStartTimePickerEnd(true)}
                            >
                              <Icon name="schedule" size={20} color="#666" />
                              <Text style={styles.dateTimeText}>
                                {formatTimeWithDot(startTime)}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Date Picker Modal */}
                        {/* {showStartDatePickerEnd && (
                          <DateTimePicker
                            value={startDateEnd}
                            mode="date"
                            display="default"
                            // onChange={(event, date) => {
                            //   setShowStartDatePickerEnd(false);
                            //   if (event.type === 'set' && date) {
                            //     setStartDateEnd(date);
                            //   }
                            // }}
                            // minimumDate={new Date()}
                            onChange={(event, date) => {
                              setShowStartDatePickerEnd(false);
                              if (event.type === 'set' && date) {
                                const proddate = getSelectedFilteredMachine[0]?.proddate;
                                const productionDate = parseProductionDate(proddate);
                                if (productionDate && date < productionDate) {
                                  showWarning(`End date cannot be earlier than ${getDisplayDateFromYYYYMMDD(proddate)}`);
                                  return;
                                }
                                setStartDateEnd(date);
                              }
                            }}
                            minimumDate={parseProductionDate(getSelectedFilteredMachine[0]?.proddate) || new Date()}
                            textColor="#000"
                            locale="en-IN"
                          />
                        )} */}
                        {showStartDatePickerEnd && (
                          <DateTimePicker
                            value={startDateEnd}
                            mode="date"
                            display="default"
                            onChange={(event, date) => {
                              setShowStartDatePickerEnd(false);
                              if (event.type === 'set' && date) {
                                const proddate = getSelectedFilteredMachine[0]?.proddate;
                                const productionDate = parseProductionDate(proddate);
                                if (productionDate && date < productionDate) {
                                  showWarning(`End date cannot be earlier than ${getDisplayDateFromYYYYMMDD(proddate)}`);
                                  return;
                                }
                                if (date < startDate) {
                                  showWarning('End date must be after or equal to start date.');
                                  return;
                                }
                                setStartDateEnd(date);
                              }
                            }}
                            minimumDate={parseProductionDate(getSelectedFilteredMachine[0]?.proddate) || new Date()}
                            textColor="#000"
                            locale="en-IN"
                          />
                        )}

                        {/* Time Picker Modal */}
                        {showStartTimePickerEnd && (
                          <DateTimePicker
                            value={startTimeEnd}
                            mode="time"
                            display="default"
                            is24Hour={true}
                            onChange={(event, time) => {
                              setShowStartTimePickerEnd(false);
                              if (event.type === 'set' && time) {
                                setStartTimeEnd(time);
                              }
                            }}
                            textColor="#000"
                            locale="en-IN"
                          />
                        )}

                        {/* Save Button */}
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={() => {
                            if (!getSelectedFilteredMachine[0]) {
                              showWarning("Please select a machine first");
                              return;
                            }
                            console.log(
                              "Selected Machine Data:",
                              getSelectedFilteredMachine[0],
                              "Start Date:",
                              selectedDate || new Date(),
                              "Start Time:",
                              selectedTime || new Date(),
                              "Combined DateTime:",
                              getDate || new Date()
                            );
                            doffUpdateEnd();
                          }}
                        >
                          <Text style={styles.saveButtonText}>END</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                  : null
              }
            </View>
          </>
        ) : (
          <>
            <View style={styles.noDataContainer}>
              <Icon name="assignment" size={60} color={theme.BRAND_GRADIENT_END} />
              <Text style={styles.noDataTitle}>No Doff Data Available</Text>
              <Text style={styles.noDataSubtitle}>
                Please load doff entry by selecting property, year, store and machine
              </Text>
              <TouchableOpacity
                style={styles.loadDataButton}
                onPress={() => setFilterVisible(true)}
              >
                <Text style={styles.loadDataButtonText}>Load Doff Data</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {getAllDoffData.length > 0 ? (
          <ScrollView contentContainerStyle={{ padding: 8 }}>
            <FlatList
              // key={refreshKey}
              data={getAllDoffData}
              keyExtractor={(item, index) => `${item.uid || index}`}
              contentContainerStyle={{ padding: 8 }}
              numColumns={numColumns}
              extraData={editableDoffData}
              key={`flatlist-${numColumns}`}
              renderItem={({ item, index }) => {
                const doffId = item.uid || index;
                const currentEditableData = editableDoffData[doffId] || {};
                const isFirstItem = index === 0;

                // --- Editable Text Component (prevents focus loss) ---
                const EditableText = ({ field, value, placeholder, editable = true }) => {
                  const [localValue, setLocalValue] = useState(value);
                  useEffect(() => {
                    setLocalValue(value);
                  }, [value]);
                  return (
                    <TextInput
                      style={styles.dateTimePickerButton}
                      value={localValue}
                      editable={editable}
                      onChangeText={setLocalValue}
                      onBlur={() => {
                        if (localValue !== value) {
                          handleFieldChange(field, localValue);
                        }
                      }}
                      keyboardType="numeric"
                      placeholder={placeholder}
                      placeholderTextColor="#999"
                    />
                  );
                };

                // --- Display helpers ---
                const getDisplayDate = (dateStr) => {
                  if (dateStr && dateStr.length === 8) {
                    // YYYYMMDD -> DD/MM/YYYY
                    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
                  }
                  return '-';
                };
                const getDisplayTime = (timeStr) => timeStr || '--:--';

                // --- Field change handler (only updates state, no refreshKey increment) ---
                const validateDates = (startDateStr, endDateStr) => {
                  // If both dates are empty, it's valid
                  if (!startDateStr && !endDateStr) return { valid: true, message: '' };

                  // If only start date is provided, it's valid (end date can be empty)
                  if (!startDateStr) return { valid: true, message: '' };

                  // Parse production date
                  const proddate = getSelectedFilteredMachine[0]?.proddate;
                  const productionDate = parseProductionDate(proddate);

                  // Parse start and end dates
                  const startDate = parseYYYYMMDD(startDateStr);
                  const endDate = endDateStr ? parseYYYYMMDD(endDateStr) : null;

                  // Log the values for debugging
                  console.log('Start Date (startDateStr):', startDateStr);
                  console.log('Parsed Start Date:', startDate);
                  console.log('End Date (endDateStr):', endDateStr);
                  console.log('Parsed End Date:', endDate);

                  // Check if start date is earlier than production date
                  if (productionDate && startDate < productionDate) {
                    return {
                      valid: false,
                      message: `Start date cannot be earlier than the production date (${getDisplayDateFromYYYYMMDD(proddate)})`
                    };
                  }

                  // Check if end date is earlier than start date
                  if (endDate && endDate < startDate) {
                    return { valid: false, message: 'End date must be after or equal to start date.' };
                  }

                  // Check if end date is earlier than production date
                  if (productionDate && endDate && endDate < productionDate) {
                    return {
                      valid: false,
                      message: `End date cannot be earlier than the production date (${getDisplayDateFromYYYYMMDD(proddate)})`
                    };
                  }

                  return { valid: true, message: '' };
                };

                const handleFieldChange = (field, value) => {
                  const newEditableData = {
                    ...editableDoffData,
                    [doffId]: { ...currentEditableData, [field]: value },
                  };

                  if (field === 'totchees' || field === 'totgrsqty') {
                    const chees = parseFloat(newEditableData[doffId]?.totchees || item.totchees || 0);
                    const grossWt = parseFloat(newEditableData[doffId]?.totgrsqty || item.totgrsqty || 0);
                    const coneWeight = parseFloat(item.coneweight || 0); // Assuming `coneweight` is available in `item`

                    // Calculate Tare Weight = Chees * Cone Weight
                    const tareWt = chees * coneWeight;
                    newEditableData[doffId].tottareqty = tareWt.toString();

                    // Calculate Net Weight = Gross Weight - Tare Weight
                    const netWt = grossWt - tareWt;
                    newEditableData[doffId].totnetqty = netWt.toString();

                    // Update the `netWt` state (if you're using it elsewhere)
                    setNetWt(netWt.toString());
                  }

                  // If field is 'startdate' or 'enddate', validate
                  if (field === 'startdate' || field === 'enddate') {
                    const startDate = newEditableData[doffId]?.startdate || item.startdate;
                    const endDate = newEditableData[doffId]?.enddate || item.enddate;

                    const validation = validateDates(startDate, endDate);
                    if (!validation.valid) {
                      showWarning(validation.message);
                      return; // Do not update state if invalid
                    }
                  }
                  setEditableDoffData(newEditableData);
                };
                // --- Date/Time picker helpers (using YYYYMMDD) ---
                const parseYYYYMMDD = (dateStr) => {
                  if (!dateStr || dateStr.length !== 8) return new Date();
                  const year = parseInt(dateStr.substring(0, 4), 10);
                  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Months are 0-indexed
                  const day = parseInt(dateStr.substring(6, 8), 10);
                  return new Date(year, month, day);
                };
                const formatDateYYYYMMDD = (date) => {
                  const y = date.getFullYear();
                  const m = (date.getMonth() + 1).toString().padStart(2, '0');
                  const d = date.getDate().toString().padStart(2, '0');
                  return `${y}${m}${d}`;
                };
                const formatTimeForPicker = (timeStr) => {
                  if (!timeStr) return new Date();
                  const [hours, minutes] = timeStr.split('.').map(Number);
                  const date = new Date();
                  date.setHours(hours, minutes, 0, 0);
                  return date;
                };

                // --- Static grid data (no editable fields here) ---
                const getCompactData = () => [
                  { label: 'Mach Speed', value: item.macactspeed },
                  { label: 'Spindles', value: item.macspindle },
                  { label: 'Act. Spin', value: item.macactspindle },
                  { label: 'Idle Spin', value: parseFloat(item.macspindle || 0) - parseFloat(item.macactspindle || 0) },
                  { label: 'Temp 1', value: item.tempone },
                  { label: 'Temp 2', value: item.temptwo },
                  { label: 'Temp 3', value: item.tempthree },
                ];

                const compactData = getCompactData();
                return (
                  <View style={item.islastdoff === '1' ? styles.compactCardLast : styles.compactCard}>
                    {/* Header */}
                    <View style={styles.compactHeader}>
                      <Text style={styles.compactTitle}>Doff #{item.doffno}</Text>
                      {isFirstItem && !hasLastDoff && (
                        <View style={styles.shiftBadgeContainer}>
                          <TouchableOpacity onPress={() => handleDoffDelete(item)}>
                            <Icon name="delete" size={20} color="red" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* Static Grid */}
                    {/* <View style={styles.compactGrid}>
            {compactData.map((row, i) => (
              <View key={i} style={styles.compactItem}>
                <Text style={styles.compactLabel}>{row.label}</Text>
                <Text style={styles.compactValue}>{row.value || '-'}</Text>
              </View>
            ))}
          </View> */}

                    {/* <View style={styles.dateTimeRow}>
            <View style={styles.halfField}>
              <Text style={styles.compactLabel}>No. Of Tubes</Text>
              <EditableText
                field="totcones"
                value={
                  currentEditableData.totcones !== undefined
                    ? currentEditableData.totcones
                    : (item.totcones || '')
                }

              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.compactLabel}>Chees</Text>
              <EditableText
                field="totchees"
                value={
                  currentEditableData.totchees !== undefined
                    ? currentEditableData.totchees
                    : (item.totchees || '')
                }
              // placeholder="Enter cone weight"
              />
            </View>
          </View> */}

                    {/* Start Date & Time */}
                    <View style={styles.dateTimeRow}>
                      <View style={styles.halfField}>
                        <Text style={styles.compactLabel}>Start Date</Text>
                        <TouchableOpacity
                          style={styles.dateTimePickerButton}
                          onPress={() => showPicker(doffId, 'startDate')}
                        >
                          <Text style={styles.compactValue}>
                            {getDisplayDate(currentEditableData.startdate || item.startdate)}
                          </Text>
                        </TouchableOpacity>
                        {/* {pickerVisibility[doffId]?.startDate && (
                          // <DateTimePicker
                          //   value={parseYYYYMMDD(currentEditableData.startdate || item.startdate)}
                          //   mode="date"
                          //   display="default"
                          //   // Inside your DateTimePicker onChange for startDate
                          //   onChange={(event, date) => {
                          //     hidePicker(doffId, 'startDate');
                          //     if (event.type === 'set' && date) {
                          //       const formatted = formatDateYYYYMMDD(date);
                          //       const endDate = currentEditableData.enddate || item.enddate;

                          //       const validation = validateDates(formatted, endDate);
                          //       if (!validation.valid) {
                          //         showWarning(validation.message);
                          //         return;
                          //       }

                          //       handleFieldChange('startdate', formatted);
                          //     }
                          //   }}
                          //   textColor="#000"
                          //   minimumDate={minDate}
                          //   maximumDate={maxDate}
                          // />
                          <DateTimePicker
                            value={parseYYYYMMDD(currentEditableData.startdate || item.startdate)}
                            mode="date"
                            display="default"
                            onChange={(event, date) => {
                              hidePicker(doffId, 'startDate');
                              if (event.type === 'set' && date) {
                                const formatted = formatDateYYYYMMDD(date);
                                const endDate = currentEditableData.enddate || item.enddate;

                                // Validate against production date and end date
                                const proddate = getSelectedFilteredMachine[0]?.proddate;
                                const productionDate = parseProductionDate(proddate);
                                const parsedDate = parseYYYYMMDD(formatted);

                                if (productionDate && parsedDate < productionDate) {
                                  showWarning(`Start date cannot be earlier than the production date (${getDisplayDateFromYYYYMMDD(proddate)})`);
                                  return;
                                }

                                const validation = validateDates(formatted, endDate);
                                if (!validation.valid) {
                                  showWarning(validation.message);
                                  return;
                                }

                                handleFieldChange('startdate', formatted);
                              }
                            }}
                            textColor="#000"
                            minimumDate={parseProductionDate(getSelectedFilteredMachine[0]?.proddate) || minDate}
                            maximumDate={maxDate}
                          />
                        )} */}
                        {pickerVisibility[doffId]?.startDate && (
                          <DateTimePicker
                            value={parseYYYYMMDD(currentEditableData.startdate || item.startdate)}
                            mode="date"
                            display="default"
                            onChange={(event, date) => {
                              hidePicker(doffId, 'startDate');
                              if (event.type === 'set' && date) {
                                const formatted = formatDateYYYYMMDD(date);
                                const endDate = currentEditableData.enddate || item.enddate;

                                // Parse production date and selected date
                                const proddate = getSelectedFilteredMachine[0]?.proddate;
                                const productionDate = parseProductionDate(proddate);
                                const parsedDate = parseYYYYMMDD(formatted);

                                // Log the values for debugging
                                console.log('Production Date (proddate):', proddate);
                                console.log('Parsed Production Date:', productionDate);
                                console.log('Selected Date (formatted):', formatted);
                                console.log('Parsed Selected Date:', parsedDate);

                                // Validate against production date
                                if (productionDate && parsedDate < productionDate) {
                                  showWarning(`Start date cannot be earlier than the production date (${getDisplayDateFromYYYYMMDD(proddate)})`);
                                  return;
                                }

                                // Validate against end date
                                const validation = validateDates(formatted, endDate);
                                if (!validation.valid) {
                                  showWarning(validation.message);
                                  return;
                                }

                                handleFieldChange('startdate', formatted);
                              }
                            }}
                            textColor="#000"
                            minimumDate={parseProductionDate(getSelectedFilteredMachine[0]?.proddate) || minDate}
                            maximumDate={maxDate}
                          />
                        )}
                      </View>
                      <View style={styles.halfField}>
                        <Text style={styles.compactLabel}>Start Time</Text>
                        <TouchableOpacity
                          style={styles.dateTimePickerButton}
                          onPress={() => showPicker(doffId, 'startTime')}
                        >
                          <Text style={styles.compactValue}>
                            {getDisplayTime(currentEditableData.starttime || item.starttime)}
                          </Text>
                        </TouchableOpacity>
                        {pickerVisibility[doffId]?.startTime && (
                          <DateTimePicker
                            value={formatTimeForPicker(currentEditableData.starttime || item.starttime)}
                            mode="time"
                            display="default"
                            is24Hour={true}
                            onChange={(event, time) => {
                              hidePicker(doffId, 'startTime');
                              if (event.type === 'set' && time) {
                                const formatted = formatTimeWithDot(time);
                                handleFieldChange('starttime', formatted);
                                // setRefreshKey(prev => prev + 1);
                              }
                            }}
                            textColor="#000"
                          />
                        )}
                      </View>
                    </View>

                    {/* End Date & Time (fixed to use YYYYMMDD) */}
                    <View style={styles.dateTimeRow}>
                      <View style={styles.halfField}>
                        <Text style={styles.compactLabel}>End Date</Text>
                        <TouchableOpacity
                          style={styles.dateTimePickerButton}
                          onPress={() => showPicker(doffId, 'endDate')}
                        >
                          <Text style={styles.compactValue}>
                            {getDisplayDate(currentEditableData.enddate || item.enddate)}
                          </Text>
                        </TouchableOpacity>
                        {/* {pickerVisibility[doffId]?.endDate && (
                          // <DateTimePicker
                          //   value={parseYYYYMMDD(currentEditableData.enddate || item.enddate)}
                          //   mode="date"
                          //   display="default"
                          //   // Inside your DateTimePicker onChange for endDate
                          //   onChange={(event, date) => {
                          //     hidePicker(doffId, 'endDate');
                          //     if (event.type === 'set' && date) {
                          //       const formatted = formatDateYYYYMMDD(date);
                          //       const startDate = currentEditableData.startdate || item.startdate;

                          //       const validation = validateDates(startDate, formatted);
                          //       if (!validation.valid) {
                          //         showWarning(validation.message);
                          //         return;
                          //       }

                          //       handleFieldChange('enddate', formatted);
                          //     }
                          //   }}
                          //   textColor="#000"
                          //   minimumDate={minDate}
                          //   maximumDate={maxDate}
                          // />
                          <DateTimePicker
                            value={parseYYYYMMDD(currentEditableData.enddate || item.enddate)}
                            mode="date"
                            display="default"
                            onChange={(event, date) => {
                              hidePicker(doffId, 'endDate');
                              if (event.type === 'set' && date) {
                                const formatted = formatDateYYYYMMDD(date);
                                const startDate = currentEditableData.startdate || item.startdate;

                                // Validate against production date and start date
                                const proddate = getSelectedFilteredMachine[0]?.proddate;
                                const productionDate = parseProductionDate(proddate);
                                const parsedDate = parseYYYYMMDD(formatted);

                                console.log('Production Date:', parsedDate);

                                if (productionDate && parsedDate < productionDate) {
                                  showWarning(`End date cannot be earlier than the production date (${getDisplayDateFromYYYYMMDD(proddate)})`);
                                  return;
                                }

                                const validation = validateDates(startDate, formatted);
                                if (!validation.valid) {
                                  showWarning(validation.message);
                                  return;
                                }

                                handleFieldChange('enddate', formatted);
                              }
                            }}
                            textColor="#000"
                            minimumDate={parseProductionDate(getSelectedFilteredMachine[0]?.proddate) || minDate}
                            maximumDate={maxDate}
                          />
                        )} */}
                        {pickerVisibility[doffId]?.endDate && (
                          <DateTimePicker
                            value={parseYYYYMMDD(currentEditableData.enddate || item.enddate)}
                            mode="date"
                            display="default"
                            onChange={(event, date) => {
                              hidePicker(doffId, 'endDate');
                              if (event.type === 'set' && date) {
                                const formatted = formatDateYYYYMMDD(date);
                                const startDate = currentEditableData.startdate || item.startdate;

                                // Parse production date and selected date
                                const proddate = getSelectedFilteredMachine[0]?.proddate;
                                const productionDate = parseProductionDate(proddate);
                                const parsedDate = parseYYYYMMDD(formatted);

                                // Log the values for debugging
                                console.log('Production Date (proddate):', proddate);
                                console.log('Parsed Production Date:', productionDate);
                                console.log('Selected Date (formatted):', formatted);
                                console.log('Parsed Selected Date:', parsedDate);

                                // Validate against production date
                                if (productionDate && parsedDate < productionDate) {
                                  showWarning(`End date cannot be earlier than the production date (${getDisplayDateFromYYYYMMDD(proddate)})`);
                                  return;
                                }

                                // Validate against start date
                                const validation = validateDates(startDate, formatted);
                                if (!validation.valid) {
                                  showWarning(validation.message);
                                  return;
                                }

                                handleFieldChange('enddate', formatted);
                              }
                            }}
                            textColor="#000"
                            minimumDate={parseProductionDate(getSelectedFilteredMachine[0]?.proddate) || minDate}
                            maximumDate={maxDate}
                          />
                        )}
                      </View>
                      <View style={styles.halfField}>
                        <Text style={styles.compactLabel}>End Time</Text>
                        <TouchableOpacity
                          style={styles.dateTimePickerButton}
                          onPress={() => showPicker(doffId, 'endTime')}
                        >
                          <Text style={styles.compactValue}>
                            {getDisplayTime(currentEditableData.endtime || item.endtime)}
                          </Text>
                        </TouchableOpacity>
                        {pickerVisibility[doffId]?.endTime && (
                          <DateTimePicker
                            value={formatTimeForPicker(currentEditableData.endtime || item.endtime)}
                            mode="time"
                            display="default"
                            is24Hour={true}
                            onChange={(event, time) => {
                              hidePicker(doffId, 'endTime');
                              if (event.type === 'set' && time) {
                                const formatted = formatTimeWithDot(time);
                                handleFieldChange('endtime', formatted);
                                // setRefreshKey(prev => prev + 1);
                              }
                            }}
                            textColor="#000"
                          />
                        )}
                      </View>
                    </View>


                    <View style={styles.dateTimeRow}>
                      <View style={styles.halfField}>
                        <Text style={styles.compactLabel}>Chees</Text>
                        <EditableText
                          field="totchees"
                          style={styles.compactValue}
                          value={
                            currentEditableData.totchees !== undefined
                              ? currentEditableData.totchees
                              : (item.totchees || '')
                          }
                        // placeholder="Enter cone weight"
                        />
                      </View>
                      <View style={styles.halfField}>
                        <Text style={styles.compactLabel}>Gross Wt.</Text>
                        <EditableText
                          field="totgrsqty"
                          value={
                            currentEditableData.totgrsqty !== undefined
                              ? currentEditableData.totgrsqty
                              : (item.totgrsqty || '')
                          }
                        // placeholder="Enter cone weight"
                        />
                      </View>
                      <View style={styles.halfField}>
                        <Text style={styles.compactLabel}>Net Wt.</Text>
                        <EditableText
                          field="totnetqty"
                          editable={false}
                          value={
                            currentEditableData.totnetqty !== undefined
                              ? currentEditableData.totnetqty
                              : (item.totnetqty || '')
                          }
                        // placeholder="Enter cone weight"
                        />
                      </View>
                      {/* <View style={styles.halfField}>
              <Text style={styles.compactLabel}>Tar Wt.</Text>
              <EditableText
                field="tottareqty"
                value={
                  currentEditableData.tottareqty !== undefined
                    ? currentEditableData.tottareqty
                    : (item.tottareqty || '')
                }
              // placeholder="Enter cone weight"
              />
            </View> */}

                    </View>

                    {/* Footer */}
                    <View style={styles.compactFooter}>
                      {isFirstItem && !hasLastDoff && (
                        <>
                          <View style={styles.switchRow}>
                            <Text style={styles.lastDoffText}>Last Doff</Text>
                            <Switch
                              value={
                                currentEditableData.islastdoff !== undefined
                                  ? currentEditableData.islastdoff === '1' || currentEditableData.islastdoff === 1 || currentEditableData.islastdoff === true
                                  : (item.islastdoff === '1' || item.islastdoff === 1)
                              }
                              onValueChange={(newValue) => {
                                // Store as '1' for true, '0' for false
                                handleFieldChange('islastdoff', newValue ? '1' : '0');
                              }}
                              trackColor={{ false: '#ccc', true: '#0F6C7B' }}
                              thumbColor="#fff"
                            />
                          </View>
                          <TouchableOpacity
                            style={styles.smallUpdateBtn}
                            onPress={() => handleDoffUpdate(item, true)}
                          >
                            <Text style={styles.smallUpdateText}>UPDATE</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          </ScrollView >
        ) : <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: 'black' }}>No doffs found!</Text>
        </View>}

      </View >

      {propertyPickerVisible && (
        <View style={styles.detailOverlay123}>
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
                  getAllPropertyData &&
                  getAllPropertyData.filter(p =>
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

      {merPickerVisible && (

        <View style={styles.detailOverlay123}>
          <View style={styles.detailContainer}>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setMerPickerVisible(false)}>
                  <Icon name="arrow-back-ios" size={20} style={{ color: '#000' }} />
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Merge</Text>
                <View style={{ width: 20 }} />
              </View>

              <View style={styles.pickerSearch}>
                <Icon name="search" size={18} color="#777" />
                <TextInput
                  placeholder="Search merge..."
                  placeholderTextColor="#000"
                  value={merSearch}
                  onChangeText={setMerSearch}
                  style={{ flex: 1, color: '#000' }}
                />
              </View>

              {selectedMer && (
                <>
                  <Text style={styles.section1}>Selected</Text>

                  <View style={styles.selectedBox}>
                    <Text style={styles.selectedText}>
                      {selectedMer.mername}
                    </Text>

                    <Icon name="check-circle" size={18} color="#0F6C7B" />
                  </View>
                </>
              )}

              <FlatList
                data={
                  getAllMerData &&
                  getAllMerData.filter(p =>
                    p.mername.toLowerCase().includes(merSearch.toLowerCase()),
                  )
                }
                keyExtractor={item => item.mercode}
                renderItem={({ item }) => {
                  const selected = selectedMer?.mercode === item.mercode;
                  return (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() => {
                        selectMerge(item);
                        setMerPickerVisible(false);
                      }}
                    >
                      <Text style={{ flex: 1, color: '#000' }}>{item.mername}</Text>
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


      {itmPickerVisible && (
        <View style={styles.detailOverlay123}>
          <View style={styles.detailContainer}>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setItmPickerVisible(false)}>
                  <Icon name="arrow-back-ios" size={20} style={{ color: '#000' }} />
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Item</Text>
                <View style={{ width: 20 }} />
              </View>

              <View style={styles.pickerSearch}>
                <Icon name="search" size={18} color="#777" />
                <TextInput
                  placeholder="Search item..."
                  placeholderTextColor="#000"
                  value={itmSearch}
                  onChangeText={setItmSearch}
                  style={{ flex: 1, color: '#000' }}
                />
              </View>

              {selectedItm && (
                <>
                  <Text style={styles.section1}>Selected</Text>

                  <View style={styles.selectedBox}>
                    <Text style={styles.selectedText}>
                      {selectedItm.itmname}
                    </Text>

                    <Icon name="check-circle" size={18} color="#0F6C7B" />
                  </View>
                </>
              )}

              <FlatList
                data={
                  getAllItmData &&
                  getAllItmData.filter(p =>
                    p.itmname.toLowerCase().includes(merSearch.toLowerCase()),
                  )
                }
                keyExtractor={item => item.itmcode}
                renderItem={({ item }) => {
                  const selected = selectedItm?.itmcode === item.itmcode;
                  return (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() => {
                        selectItem(item);
                        setItmPickerVisible(false);
                      }}
                    >
                      <Text style={{ flex: 1, color: '#000' }}>{item.itmname}</Text>
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

      {yearPickerVisible && (
        <View style={styles.detailOverlay123}>
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
                data={getAllYearData}
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

      {storePickerVisible && (
        <View style={styles.detailOverlay123}>
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

      {machinePickerVisible && (
        <View style={styles.detailOverlay123}>
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

              {selectedMachines?.MacName && (
                <>
                  <Text style={styles.section1}>Selected</Text>

                  <View style={styles.selectedBox}>
                    <Text style={styles.selectedText}>
                      {selectedMachines?.MacName}
                    </Text>

                    <Icon name="check-circle" size={18} color="#0F6C7B" />
                  </View>
                </>
              )}

              <FlatList
                data={
                  getAllMachines &&
                  getAllMachines.filter(p =>
                    p.MacName.toLowerCase().includes(machineSearch.toLowerCase()),
                  )
                }
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => {
                  const selected = selectedMachines?.MacCode === item.MacCode;
                  //const selected = selectedMachines.some( i => i.MacCode === item.MacCode,);

                  return (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() => {
                        setSelectedMachines(item);
                        setMachinePickerVisible(false);
                      }}
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

      {/* FILTER MODAL */}

      {filterVisible && (
        // <Modal
        //   transparent
        //   visible={filterVisible}
        //   animationType="fade"
        //   statusBarTranslucent={true}
        // >
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
                      <Icon name="close" size={20} style={{ color: '#000' }} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Property</Text>
                  <TouchableOpacity
                    style={styles.inputBoxProperty}
                    onPress={() => setPropertyPickerVisible(true)}
                  >
                    <Text numberOfLines={1} style={{ color: '#000' }}>
                      {selectedProperty?.LngName || 'Select property'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={24} />
                  </TouchableOpacity>

                  <View style={styles.row}>
                    {/* Year */}
                    <View style={styles.halfField}>
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

                    {/* Store */}
                    <View style={styles.halfField}>
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

                  <Text style={styles.label}>Merge</Text>
                  <TouchableOpacity
                    style={styles.inputBoxProperty}
                    // onPress={getMergeData}
                    onPress={() => setMerPickerVisible(true)}
                  >
                    <Text numberOfLines={1} style={{ color: '#000' }}>
                      {selectedMer?.mername || 'Select merge'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={24} />
                  </TouchableOpacity>

                  <Text style={styles.label}>Item</Text>
                  <TouchableOpacity
                    style={styles.inputBoxProperty}
                    // onPress={getItmData}
                    onPress={() => setItmPickerVisible(true)}
                  >
                    <Text numberOfLines={1} style={{ color: '#000' }}>
                      {selectedItm?.itmname || 'Select item'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={24} />
                  </TouchableOpacity>

                  {/* Machine */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Machine</Text>
                    <TouchableOpacity
                      style={styles.inputBox}
                      // onPress={getMachineData}
                      onPress={() => setMachinePickerVisible(true)}
                    >
                      <Text numberOfLines={1} style={{ color: '#000' }}>
                        {selectedMachines?.MacName || 'Select machine'}
                        {/* {(selectedMachines &&
                      selectedMachines.map(i => i.MacName).join(', ')) ||
                      'Select machine'} */}
                      </Text>
                      <Icon name="keyboard-arrow-down" size={24} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={() => {
                      showData(selectedMachines);
                      // setFilterVisible(false);
                    }}
                  >
                    <Text style={{ color: '#fff' }}>Load data</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
        // </Modal>
      )}

      <Modal
        transparent
        visible={doffUpdateFormVisible}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.title}>Update doff form</Text>
                <TouchableOpacity
                  onPress={() => setDoffUpdateFormVisible(false)}
                >
                  <Icon name="close" size={20} style={{ color: '#000' }} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Property</Text>
              <TouchableOpacity
                style={styles.inputBoxProperty}
                onPress={() => setPropertyPickerVisible(true)}
              >
                <Text numberOfLines={1} style={{ color: '#000' }}>
                  {selectedProperty?.LngName || 'Select property'}
                </Text>
                <Icon name="keyboard-arrow-down" size={24} />
              </TouchableOpacity>

              <View style={styles.row}>
                <View style={styles.halfField}>
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

                <View style={styles.halfField}>
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

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Machine</Text>
                <TouchableOpacity
                  style={styles.inputBox}
                  onPress={getMachineData}
                >
                  <Text numberOfLines={1} style={{ color: '#000' }}>
                    {selectedMachines?.MacName || 'Select machine'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Machine Speed</Text>
                  <TextInput
                    value={macactspeed}
                    onChangeText={setMacactspeed}
                    placeholder="Enter speed"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.label}>No. of Spindles</Text>
                  <TextInput
                    value={macspindle}
                    onChangeText={setMacspindle}
                    placeholder="Enter spindles"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Act. spindles</Text>
                  <TextInput
                    value={macactspindle}
                    onChangeText={setMacactspindle}
                    placeholder="Enter speed"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.label}>Idle spindles</Text>
                  <TextInput
                    value={macidlespindle}
                    onChangeText={setMacidlespindle}
                    placeholder="Enter spindles"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Unit start</Text>
                  <TextInput
                    value={startreading}
                    onChangeText={setStartreading}
                    placeholder="Enter speed"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.label}>Temp. one</Text>
                  <TextInput
                    value={tempone}
                    onChangeText={setTempone}
                    placeholder="Enter spindles"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Temp. two</Text>
                  <TextInput
                    value={temptwo}
                    onChangeText={setTemptwo}
                    placeholder="Enter speed"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.label}>Temp. three</Text>
                  <TextInput
                    value={tempthree}
                    onChangeText={setTempthree}
                    placeholder="Enter spindles"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Start Time</Text>

                  <TouchableOpacity
                    style={styles.inputField}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Text style={{ color: '#000' }}>
                      {startTime
                        ? startTime.toLocaleString() // full date + time
                        : 'Select start time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>End Time</Text>

                  <TouchableOpacity
                    style={styles.inputField}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text style={{ color: '#000' }}>
                      {endTime ? endTime.toLocaleString() : 'Select end time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>No. of tubes</Text>
                  <TextInput
                    value={totcones}
                    onChangeText={setTotcones}
                    placeholder="Enter speed"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.label}>Chees</Text>
                  <TextInput
                    value={totchees}
                    onChangeText={setTotchees}
                    placeholder="Enter spindles"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Gross wt.</Text>
                  <TextInput
                    value={totgrsqty}
                    onChangeText={setTotgrsqty}
                    placeholder="Enter speed"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.label}>Tar. Wt.</Text>
                  <TextInput
                    value={totchees}
                    onChangeText={setTotchees}
                    placeholder="Enter spindles"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Net wt.</Text>
                  <TextInput
                    value={totnetqty}
                    onChangeText={setTotnetqty}
                    placeholder="Enter speed"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.label}>Unit end</Text>
                  <TextInput
                    value={endreading}
                    onChangeText={setEndreading}
                    placeholder="Enter spindles"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Tot. unit</Text>
                  <TextInput
                    value={powerconsumption}
                    onChangeText={setPowerconsumption}
                    placeholder="Enter speed"
                    keyboardType="numeric"
                    style={styles.inputField}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>
                  Is last Doff [islastdoff] ?
                </Text>

                <Switch
                  value={false}
                  trackColor={{ false: '#ccc', true: '#0F6C7B' }}
                  thumbColor="#fff"
                />
              </View>

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  //savedata();
                  setDoffUpdateFormVisible(false);
                }}
              >
                <Text style={{ color: '#fff' }}>Update</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showDeleteConfirm}
        animationType="slide"
        statusBarTranslucent={true}
      >
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
            <Icon name="warning" size={40} color="#FFA000" />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                marginTop: 10,
                color: '#000',
              }}
            >
              Confirm Delete
            </Text>
            <Text style={{ textAlign: 'center', marginTop: 8, color: '#444' }}>
              Are you sure you want to delete this doff entry?
            </Text>

            <View style={{ flexDirection: 'row', marginTop: 20, gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(false)}
                style={{
                  backgroundColor: '#ccc',
                  paddingHorizontal: 25,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#000', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setShowDeleteConfirm(false);
                  try {
                    const mergedPayload = createMergedPayload(getAllDoffDataNew, getSelectedFilteredMachine);
                    let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
                    let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
                    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
                    let finalmerCode = selectedMer ? selectedMer?.mercode : '';
                    let finalitmCode = selectedItm ? selectedItm?.itmcode : '';

                    const finalPayload = {
                      prpcode: prp3,
                      yearno: yearnumber3,
                      strcode: finalStrCode,
                      mercode: finalmerCode,
                      itmcode: finalitmCode,
                      txntype: 'mobile_doff_entry',
                      maccode: itemToDelete?.maccode,
                      uid: itemToDelete?.uid,
                      productionuid: itemToDelete?.productionuid,
                    };

                    console.log('📤 doff Delete PAYLOAD:', finalPayload);

                    const response = await axios.post(
                      `${API}/api/proddoffdelete`,
                      finalPayload,
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                      }
                    );

                    if (response.data.success) {
                      const data = response.data.data.main;
                      showSuccess('Doff deleted successfully');
                      setAllDoffData(data);
                      setAllDoffDataNew(response.data.data.mainnew);
                    } else {
                      showWarning(response.data.message || 'Failed to delete doff');
                    }
                  } catch (error) {
                    console.log('❌ API Error:', error);
                    showError('API failed: ' + (error.response?.data?.message || error.message));
                  }
                }}
                style={{
                  backgroundColor: '#F44336',
                  paddingHorizontal: 25,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showUpdateConfirm}
        animationType="slide"
        statusBarTranslucent={true}
      >
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
            <Icon name="warning" size={40} color="#FFA000" />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                marginTop: 10,
                color: '#000',
              }}
            >
              Confirm Update
            </Text>
            <Text style={{ textAlign: 'center', marginTop: 8, color: '#444' }}>
              Are you sure you want to update this doff entry?
            </Text>

            <View style={{ flexDirection: 'row', marginTop: 20, gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowUpdateConfirm(false)}
                style={{
                  backgroundColor: '#ccc',
                  paddingHorizontal: 25,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#000', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setShowUpdateConfirm(false);
                  const doffId = itemToUpdate.uid || getAllDoffData.indexOf(itemToUpdate);
                  const latestEditedData = editableDoffData[doffId] || {};
                  // const Netvalue =
                  //   (parseFloat(latestEditedData?.totgrsqty) || parseFloat(itemToUpdate?.totgrsqty) || 0) -
                  //   (parseFloat(latestEditedData?.totnetqty) || parseFloat(itemToUpdate?.totnetqty) || 0);
                  // const Netvalue =
                  //   (parseFloat(latestEditedData?.totchees) || parseFloat(itemToUpdate?.totchees) || 0) *
                  //   (parseFloat(latestEditedData?.coneweight) || parseFloat(itemToUpdate?.coneweight) || 0);


                  if (getValidation) {
                    if (latestEditedData.totchees === null || !latestEditedData.totchees || latestEditedData.totchees === '') {
                      console.log('Chees value:', latestEditedData.totchees, itemToUpdate.totchees);
                      if (itemToUpdate.totchees) {

                      } else {
                        showWarning('Please enter Chees');
                        return;
                      }
                    }
                    else if (latestEditedData.totgrsqty === null || !latestEditedData.totgrsqty || latestEditedData.totgrsqty === '') {
                      console.log('Gross Wt.:', latestEditedData.totgrsqty, itemToUpdate.totgrsqty);
                      if (itemToUpdate.totgrsqty) {

                      } else {
                        showWarning('Please enter Gross Wt.');
                        return;
                      }
                    }
                    // else if (latestEditedData.totnetqty === null || !latestEditedData.totnetqty || latestEditedData.totnetqty === '') {
                    //   console.log('Net Wt.', latestEditedData.totnetqty, itemToUpdate.totnetqty);
                    //   if (itemToUpdate.totnetqty) {

                    //   } else {
                    //     showWarning('Please enter Net Wt.');
                    //     return;
                    //   }
                    // }
                  }
                  try {
                    let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
                    let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
                    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
                    let finalmerCode = selectedMer ? selectedMer?.mercode : '';
                    let finalitmCode = selectedItm ? selectedItm?.itmcode : '';
                    // Get the latest edited data for this doff


                    // Prepare the payload with the latest edited data
                    const finalPayload = {
                      prpcode: prp3,
                      yearno: yearnumber3,
                      strcode: finalStrCode,
                      mercode: finalmerCode,
                      itmcode: finalitmCode,
                      txntype: 'mobile_doff_entry',
                      maccode: itemToUpdate?.maccode,
                      uid: itemToUpdate?.uid,
                      productionuid: itemToUpdate?.productionuid,
                      // Use the latest edited data
                      startdate: latestEditedData.startdate || itemToUpdate.startdate,
                      starttime: latestEditedData.starttime || itemToUpdate.starttime,
                      enddate: latestEditedData.enddate || itemToUpdate.enddate,
                      endtime: latestEditedData.endtime || itemToUpdate.endtime,

                      startreading: latestEditedData.startreading || itemToUpdate.startreading,
                      endreading: latestEditedData.endreading || itemToUpdate.endreading,
                      totcones: latestEditedData.totchees || itemToUpdate.totchees,  // Add this
                      totchees: latestEditedData.totchees || itemToUpdate.totchees,  // Add this
                      totnetqty: latestEditedData.totnetqty || itemToUpdate.totnetqty,  // Add this
                      // tottareqty: (() => {
                      //   const value =
                      //     (parseFloat(latestEditedData?.totgrsqty) || parseFloat(itemToUpdate?.totgrsqty) || 0) -
                      //     (parseFloat(latestEditedData?.totnetqty) || parseFloat(itemToUpdate?.totnetqty) || 0);

                      //   return isNaN(value) || value === null ? "0" : value.toString();
                      // })(),
                      tottareqty: latestEditedData.tottareqty || itemToUpdate.tottareqty,
                      totgrsqty: latestEditedData.totgrsqty || itemToUpdate.totgrsqty,  // Add this
                      islastdoff: latestEditedData.islastdoff || itemToUpdate.islastdoff,  // Add this
                      d1: [],
                      d2: [],
                      // Include all other fields from the original itemToUpdate
                      ...Object.fromEntries(
                        Object.entries(itemToUpdate).filter(([key]) =>
                          !['startdate', 'starttime', 'enddate', 'endtime', 'totcones', 'totchees', 'totnetqty', 'tottareqty', 'totgrsqty', 'islastdoff'].includes(key)
                        )
                      )
                    };

                    console.log('📤 doff Update PAYLOAD:', finalPayload);

                    const response = await axios.post(
                      `${API}/api/proddoffedit`,
                      finalPayload,
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                      }
                    );

                    console.log('📤 doff Update response:', response);

                    if (response.data.success) {
                      const data = response.data.data.main;
                      showSuccess('Doff updated successfully');
                      setAllDoffData(data);
                      setAllDoffDataNew(response.data.data.mainnew);
                      // Clear the editable data for this doff after successful update
                      setEditableDoffData(prev => {
                        const newData = { ...prev };
                        delete newData[doffId];
                        return newData;
                      });
                    } else {
                      showWarning(response.data.message || 'Failed to update doff');
                    }
                  } catch (error) {
                    console.log('❌ API Error:', error);
                    showError('API failed: ' + (error.response?.data?.message || error.message));
                  }
                }}
                style={{
                  backgroundColor: '#F44336',
                  paddingHorizontal: 25,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal >

    </>
  );
};

export default DoffEntry;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EEF2F7',
  },

  /* ================= HEADER ================= */

  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 42,
    paddingBottom: 14,
    backgroundColor: '#0F6C7B',
    elevation: 4,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  /* ================= ACCORDION ================= */

  // accordionHeader: {
  //   backgroundColor: '#0F6C7B',
  //   borderRadius: 14,
  //   paddingVertical: 4,
  //   paddingHorizontal: 16,
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   marginBottom: 10,
  //   elevation: 2,
  // },

  // accordionTitle: {
  //   color: '#FFFFFF',
  //   fontSize: 15,
  //   fontWeight: '600',
  // },

  accordionContainer: {
    marginHorizontal: 16,
    // marginVertical: 0,
    marginTop: 5,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  accordionHeader: {
    backgroundColor: theme.BRAND_GRADIENT_END,
    padding: 7.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accordionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  accordionContent: {
    backgroundColor: '#fff',
    padding: 16,
  },
  machineInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    // marginBottom: 16,
  },
  machineInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  machineInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    width: '40%',
  },
  machineInfoValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dateTimeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    // marginBottom: 16,
  },
  dateTimeText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  saveButton: {
    backgroundColor: theme.BRAND_GRADIENT_END,
    borderRadius: 8,
    padding: 5,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  /* ================= FORM CARD ================= */

  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 3,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  /* ================= FORM FIELDS ================= */

  fieldContainer: {
    marginBottom: 16,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  halfField: {
    flex: 1,
    marginHorizontal: 4,
    //width: '48%',
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginLeft: 2,
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#D6DEE8',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    height: 50,
    justifyContent: 'center',
  },

  picker: {
    height: 50,
    color: '#0F172A',
  },

  /* ================= BUTTON ================= */

  // saveButton: {
  //   height: 30,
  //   backgroundColor: '#0F6C7B',
  //   borderRadius: 14,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   marginTop: 8,
  //   elevation: 2,
  // },

  // saveButtonText: {
  //   color: '#FFFFFF',
  //   fontSize: 13,
  //   fontWeight: '500',
  //   //letterSpacing: 0.5,
  // },

  /**  css copied from production report */

  inputBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: 5,
  },
  inputBoxProperty: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: 5,
    width: '100%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    marginTop: 27,
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
  section1: {
    marginLeft: 10,
    marginBottom: 2,
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
  bigInput: {
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputText: { flex: 1, color: '#000' },

  /** css copied from production report end */

  doffCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 3,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  cardMachine: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },

  shiftBadge: {
    backgroundColor: '#0F6C7B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  shiftBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  shiftText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  //   infoLabel: {
  //     fontSize: 13,
  //     color: '#64748B',
  //   },

  //   infoValue: {
  //     fontSize: 13,
  //     fontWeight: '600',
  //     color: '#0F172A',
  //   },

  inputField: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
    color: '#000',
    flex: 1, // 🔥 IMPORTANT
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  overlayUpdateForm: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },

  sheet: {
    backgroundColor: '#e9e6e6',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  //   sheetUpdateForm: {
  //     flex: 1,
  //     backgroundColor: '#fff',
  //     borderTopLeftRadius: 20,
  //     borderTopRightRadius: 20,
  //     padding: 16,
  //     //height: '90%', // IMPORTANT
  //   },
  sheetUpdateForm: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,

    height: '90%', // 🔥 IMPORTANT (must exist)
  },

  applyBtn: {
    backgroundColor: '#0F2027',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fabAdd: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#007EA7',
    width: 25,
    height: 25,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 10,
  },

  summaryCard: {
    backgroundColor: '#e4e1e1',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  doffNo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  infoBox: {
    width: '48%',
  },

  singleInfo: {
    marginBottom: 14,
  },

  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 3,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 14,
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },

  switchText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  updateButton: {
    backgroundColor: '#0F6C7B',
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 14,
  },

  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'normal',
  },

  addDoffcompactCard: {
    backgroundColor: '#e4e1e1',
    borderRadius: 12,
    padding: 10,
    // marginBottom: 5,
    elevation: 2,
  },

  compactCard: {
    backgroundColor: '#e4e1e1',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    elevation: 2,
    flex: 1, // <-- This makes the card take equal width in a row
    marginHorizontal: 4, // <-- Add horizontal margin for spacing
  },

  compactCardLast: {
    backgroundColor: '#e4e1e1',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 69, 69, 0.41)',
    flex: 1,
    marginHorizontal: 4,
  },

  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  compactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  compactItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 6,
  },

  compactLabel: {
    fontSize: 10,
    color: '#64748B',
  },

  compactValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },

  compactFooter: {
    marginTop: 4,
  },

  lastDoffText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },

  smallUpdateBtn: {
    backgroundColor: '#0F6C7B',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },

  smallDeleteBtn: {
    // backgroundColor: '#0F6C7B',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    // marginTop: 8,
  },

  smallUpdateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  noDataContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  noDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noDataSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  loadDataButton: {
    backgroundColor: theme.BRAND_GRADIENT_END,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  loadDataButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  dateTimePickerButton: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginTop: 2,
    color: '#0F6C7B',
  },

  machineInfoCard: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    // borderRadius: 8,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    // padding: 8, // Reduced padding
    // marginHorizontal: 5,
    marginVertical: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1.5,
    borderColor: theme.BRAND_GRADIENT_START
  },
  machineInfoCardNew: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    // padding: 8, // Reduced padding
    marginHorizontal: 15,
    marginVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1.5,
    borderColor: theme.BRAND_GRADIENT_START
  },
  machineInfoScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  machineInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4, // Reduced margin
  },
  machineInfoLabel: {
    fontSize: 12, // Smaller font
    fontWeight: '600',
    color: '#4B5563',
    marginRight: 4,
  },
  machineInfoValue: {
    fontSize: 12, // Smaller font
    color: '#1F2937',
  },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1.5,
    borderColor: theme.BRAND_GRADIENT_START
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    // marginBottom: 2,
  },
  summaryValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F6C7B',
  },

  listIconContainer: {
    position: 'absolute',
    top: 245,
    right: 25,
    zIndex: 1,
    backgroundColor: theme.BRAND_GRADIENT_END,
    color: '#fff',
    borderRadius: 3,
    padding: 3,
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
