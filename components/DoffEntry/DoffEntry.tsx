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
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import {
  fetchAllPropertyData,
  fetchAllYeardata,
  fetchAllStoredata,
} from '../../common/API/Functions';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import DateTimePicker from '@react-native-community/datetimepicker';

const DoffEntry = ({ navigation, token }) => {
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
  const [getAllPropertyData, setAllPropertyData] = useState([]);
  const [getAllYearData, setAllYearData] = useState([]);
  const [getAllStoreData, setAllStoreData] = useState([]);
  const [txnType, setTxnType] = useState('mobile_doff_entry');

  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);

  const [selectedProperty, setSelectedProperty] = useState(null);
  const [propertySearch, setPropertySearch] = useState('');
  const [recentProps, setRecentProps] = useState([]);

  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');

  const [storePickerVisible, setStorePickerVisible] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');

  const [machinePickerVisible, setMachinePickerVisible] = useState(false);
  const [getAllMachines, setAllMachines] = useState([]);
  const [machineSearch, setMachineSearch] = useState('');
  const [selectedMachines, setSelectedMachines] = useState(null);
  const [getAllDoffData, setAllDoffData] = useState([]);
  const [macactspeed, setMacactspeed] = useState('');
  const [macspindle, setMacspindle] = useState('');
  const [macactspindle, setMacactspindle] = useState('');
  const [macidlespindle, setMacidlespindle] = useState('');
  const [startreading, setStartreading] = useState('');
  const [tempone, setTempone] = useState('');
  const [temptwo, setTemptwo] = useState('');
  const [tempthree, setTempthree] = useState('');

  const [startTime, setStartTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);

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

  useEffect(() => {
    const load = async () => {
      const data = await fetchAllPropertyData(token);
      setAllPropertyData(data);

      if (data?.length) setAllPropertyData(data);
    };

    setTimeout(() => {
      load();
    }, 2000);
  }, [token]);

  useEffect(() => {
    if (
      typeof selectedProperty != 'undefined' &&
      selectedProperty != null &&
      selectedProperty != '' &&
      Object.keys(selectedProperty).length > 0
    ) {
      const yearFunc = async () => {
        const allyeardata = await fetchAllYeardata(token, formData.PrpCode);

        setAllYearData(allyeardata);
      };

      yearFunc();
    }
  }, [selectedProperty]);

  useEffect(() => {
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

      const storeFunc = async () => {
        const allstoredata = await fetchAllStoredata(token, prp, yr, txnType);

        setAllStoreData(allstoredata);
      };

      storeFunc();
    }
  }, [selectedYear]);

  const selectProperty = item => {
    setSelectedProperty(item);

    const updated = [
      item,
      ...recentProps.filter(p => p.PrpCode !== item.PrpCode),
    ];
    setRecentProps(updated.slice(0, 3));
  };

  const getMachineData = async () => {
    let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
    let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';

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

  //   useEffect(() => {
  //     if (selectedMachines) {
  //       showData();
  //     }
  //   }, [selectedMachines]);

  const showData = async () => {
    let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
    let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
    let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
    let finalMacCode = selectedMachines?.MacCode || '';

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
        };
        const respo = await axios.get(`${API}/api/proddoffshow`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          params: payload,
        });
        console.log('proddoffshow api response : ', respo.data.data);
        if (respo.data.success && respo.data.data?.main?.length > 0) {
          setAllDoffData(respo.data.data.main);
        } else {
          console.log('API response issue:', respo.data);
        }
      } catch (error) {
        console.log('Machine Change API Error =>', error);
      }
    }

    setFilterVisible(false);
  };

  console.log('===getAllDoffData===', getAllDoffData);

  return (
    <>
      <View style={{ flex: 1, backgroundColor: '#F5F7FB' }}>
        {/* Top Header */}
        <LinearGradient
          colors={['#0F6C7B', '#13879A']}
          style={styles.topHeader}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Icon name="arrow-back-ios-new" size={18} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Doff Entry</Text>

          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <Icon name="tune" size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 8 }}>
          {/* <TouchableOpacity
            style={styles.accordionHeader}
            activeOpacity={0.8}
            onPress={() => setExpanded(!expanded)}
          >
            <View>
              <Text style={styles.accordionTitle}>Start Doff</Text>
            </View>

            <Icon
              name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={30}
              color="#fff"
            />
          </TouchableOpacity>

          {expanded && (
            <View style={styles.formContainer}>
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
                        : 'Select Start Time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton}>
                <Text style={styles.saveButtonText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          )} */}

          <FlatList
            data={getAllDoffData}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={{ padding: 8 }}
            renderItem={({ item, index }) => {
              const compactData = [
                { label: 'Mach Speed', value: item.macactspeed },
                { label: 'Spindles', value: item.macspindle },

                { label: 'Act. Spin', value: item.macactspindle },
                {
                  label: 'Idle Spin',
                  value:
                    parseFloat(item.macspindle || 0) -
                    parseFloat(item.macactspindle || 0),
                },

                { label: 'Unit Start', value: item.startreading },
                { label: 'Temp 1', value: item.tempone },

                { label: 'Temp 2', value: item.temptwo },
                { label: 'Temp 3', value: item.tempthree },

                {
                  label: 'Start',
                  value: `${item.startdate} ${item.starttime}`,
                },

                {
                  label: 'End',
                  value: `${item.enddate} ${item.endtime}`,
                },

                { label: 'Tubes', value: item.totcones },
                { label: 'Chees', value: item.totchees },

                { label: 'Gross', value: item.totgrsqty },
                { label: 'Tare', value: item.tottareqty },

                { label: 'Net', value: item.totnetqty },
                { label: 'Tot Unit', value: item.powerconsumption },
              ];

              return (
                <View style={styles.compactCard}>
                  {/* Header */}
                  <View style={styles.compactHeader}>
                    <Text style={styles.compactTitle}>Doff #{index + 1}</Text>

                    <View style={styles.shiftBadge}>
                      <Text style={styles.shiftText}>
                        {item.shfname || 'Shift'}
                      </Text>
                    </View>
                  </View>

                  {/* Compact Grid */}
                  <View style={styles.compactGrid}>
                    {compactData.map((row, i) => (
                      <View key={i} style={styles.compactItem}>
                        <Text style={styles.compactLabel}>{row.label}</Text>

                        <Text numberOfLines={1} style={styles.compactValue}>
                          {row.value || '-'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Footer */}
                  <View style={styles.compactFooter}>
                    <View style={styles.switchRow}>
                      <Text style={styles.lastDoffText}>Last Doff</Text>

                      <Switch
                        value={false}
                        trackColor={{ false: '#ccc', true: '#0F6C7B' }}
                        thumbColor="#fff"
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.smallUpdateBtn}
                      onPress={() => setDoffUpdateFormVisible(true)}
                    >
                      <Text style={styles.smallUpdateText}>UPDATE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            // renderItem={({ item }) => (

            //   <View style={styles.summaryCard}>

            //     <View style={styles.cardTop}>
            //       <Text style={styles.doffNo}>Doff No : 1</Text>

            //       <View style={styles.shiftBadge}>
            //         <Text style={styles.shiftText}>
            //           {item.shfname || 'Shift'}
            //         </Text>
            //       </View>
            //     </View>

            //     <View style={styles.infoGrid}>
            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Machine Speed</Text>
            //         <Text style={styles.infoValue}>{item.macactspeed}</Text>
            //       </View>

            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>No. of Spindles</Text>
            //         <Text style={styles.infoValue}>{item.macspindle}</Text>
            //       </View>
            //     </View>

            //     <View style={styles.infoGrid}>
            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Act. Spindles</Text>
            //         <Text style={styles.infoValue}>{item.macactspindle}</Text>
            //       </View>

            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Idle Spindles</Text>
            //         <Text style={styles.infoValue}>{parseFloat(item.macspindle) - parseFloat(item.macactspindle)}</Text>
            //       </View>
            //     </View>

            //     <View style={styles.infoGrid}>
            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Unit Start</Text>
            //         <Text style={styles.infoValue}>{item.startreading}</Text>
            //       </View>

            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Temp. One</Text>
            //         <Text style={styles.infoValue}>{item.tempone}</Text>
            //       </View>
            //     </View>

            //     <View style={styles.infoGrid}>
            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Temp. Two</Text>
            //         <Text style={styles.infoValue}>{item.temptwo}</Text>
            //       </View>

            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Temp. Three</Text>
            //         <Text style={styles.infoValue}>{item.tempthree}</Text>
            //       </View>
            //     </View>

            //     <View style={styles.singleInfo}>
            //       <Text style={styles.infoLabel}>Start Datetime</Text>
            //       <Text style={styles.infoValue}>{item.startdate}: {item.starttime}</Text>
            //     </View>

            //     <View style={styles.divider} />

            //     <View style={styles.infoGrid}>
            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>End Datetime</Text>
            //         <Text style={styles.infoValue}>{item.enddate}: {item.endtime}</Text>
            //       </View>

            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>No. of Tubes</Text>
            //         <Text style={styles.infoValue}>{item.totcones}</Text>
            //       </View>
            //     </View>

            //     <View style={styles.infoGrid}>
            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Chees</Text>
            //         <Text style={styles.infoValue}>{item.totchees}</Text>
            //       </View>

            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Gross Wt.</Text>
            //         <Text style={styles.infoValue}>{item.totgrsqty}</Text>
            //       </View>
            //     </View>

            //     <View style={styles.infoGrid}>
            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Tar. Wt.</Text>
            //         <Text style={styles.infoValue}>{item.tottareqty}</Text>
            //       </View>

            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Net Wt.</Text>
            //         <Text style={styles.infoValue}>{item.totnetqty}</Text>
            //       </View>
            //     </View>

            //     <View style={styles.infoGrid}>
            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Unit End</Text>
            //         <Text style={styles.infoValue}>{item.endreading}</Text>
            //       </View>

            //       <View style={styles.infoBox}>
            //         <Text style={styles.infoLabel}>Tot. Unit</Text>
            //         <Text style={styles.infoValue}>{item.powerconsumption}</Text>
            //       </View>
            //     </View>

            //     <View style={styles.switchRow}>
            //       <Text style={styles.switchText}>Is last Doff [islastdoff] ?</Text>

            //       <Switch
            //         value={false}
            //         trackColor={{ false: '#ccc', true: '#0F6C7B' }}
            //         thumbColor="#fff"
            //       />
            //     </View>

            //     <TouchableOpacity style={styles.updateButton}>
            //       <Text style={styles.updateButtonText}>UPDATE</Text>
            //     </TouchableOpacity>
            //   </View>
            // )}
          />
        </ScrollView>
      </View>

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
      </Modal>

      <Modal
        visible={yearPickerVisible}
        animationType="slide"
        statusBarTranslucent={true}
      >
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
      </Modal>

      <Modal
        visible={storePickerVisible}
        animationType="slide"
        statusBarTranslucent={true}
      >
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
      </Modal>

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
                  //   onPress={() =>
                  //     toggleSelection(
                  //       item,
                  //       selectedMachines,
                  //       setSelectedMachines,
                  //       'MacCode',
                  //     )
                  //   }
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

      {showStartTimePicker && (
        <DateTimePicker
          value={getDate || new Date()}
          mode="date"
          onChange={(event, selectedDate) => {
            if (event.type === 'set' && selectedDate) {
              setDate(selectedDate);
            }
            setShowStartTimePicker(false);
          }}
        />
      )}

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

              {/* Machine */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Machine</Text>
                <TouchableOpacity
                  style={styles.inputBox}
                  onPress={getMachineData}
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
                  showData();
                  setFilterVisible(false);
                }}
              >
                <Text style={{ color: '#fff' }}>Load data</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/** Doff Add Form modal */}
      <Modal
        transparent
        visible={doffAddFormVisible}
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
                <Text style={styles.title}>Start doff form</Text>
                <TouchableOpacity onPress={() => setDoffAddFormVisible(false)}>
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

              {/* Machine */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Machine</Text>
                <TouchableOpacity
                  style={styles.inputBox}
                  onPress={getMachineData}
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

              {/* Machine Speed + Spindles */}
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
                        : 'Select Start Time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  //savedata();
                  setDoffAddFormVisible(false);
                }}
              >
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/**doff update form */}
      {/* <Modal
        transparent
        visible={doffUpdateFormVisible}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.overlayUpdateForm}>
          <View style={styles.sheetUpdateForm}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 50 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
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
      </Modal> */}

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

      <TouchableOpacity
        style={styles.fabAdd}
        onPress={() => {
          setDoffAddFormVisible(true);
        }}
      >
        <Icon name="add" size={20} color="#fff" />
      </TouchableOpacity>
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

  accordionHeader: {
    backgroundColor: '#0F6C7B',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
  },

  accordionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
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

  saveButton: {
    height: 30,
    backgroundColor: '#0F6C7B',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    //letterSpacing: 0.5,
  },

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

  compactCard: {
    backgroundColor: '#e4e1e1',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    elevation: 2,
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

  smallUpdateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
