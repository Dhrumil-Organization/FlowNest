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

const DoffEntry = ({ navigation, token }) => {
  const [filterVisible, setFilterVisible] = useState(false);
  const [formData, setFormData] = useState({
    PrpCode: '',
    YearNo: '',
    StrCode: '',
    MacCode: '',
  });
  const [expanded, setExpanded] = useState(true);
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

  useEffect(() => {
    if (selectedMachines) {
      showData();
    }
  }, [selectedMachines]);

  const showData = async () => {
    try {
      let prp3 = selectedProperty ? selectedProperty?.PrpCode : '';
      let yearnumber3 = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
      let finalStrCode = selectedStore ? selectedStore?.StrCode : '';
      let finalMacCode = selectedMachines?.MacCode || '';

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
      console.log('proddoffshow api response : ', respo.data.data.main);
      if (respo.data.success && respo.data.data?.main?.length > 0) {
        setAllDoffData(respo.data.data.main);
      } else {
        console.log('API response issue:', respo.data);
      }
    } catch (error) {
      console.log('Machine Change API Error =>', error);
    }
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
          <TouchableOpacity
            style={styles.accordionHeader}
            activeOpacity={0.8}
            onPress={() => setExpanded(!expanded)}
          >
            <View>
              <Text style={styles.accordionTitle}>Select data</Text>
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

              <TouchableOpacity style={styles.saveButton}>
                <Text style={styles.saveButtonText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* ScrollView END */}
      </View>

      {getAllDoffData && getAllDoffData.length > 0 && (
        <View style={{ marginTop: 15 }}>
          {getAllDoffData.map((item, index) => (
            <View key={index} style={styles.doffCard}>
              {/* Top Row */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardMachine}>{item.macname}</Text>

                <View style={styles.shiftBadge}>
                  <Text style={styles.shiftText}>{item.shfname}</Text>
                </View>
              </View>

              {/* Material */}
              <Text style={styles.itemName}>{item.itmname}</Text>

              {/* Info Rows */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Voucher No:</Text>
                <Text style={styles.infoValue}>{item.vouno}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Doff No:</Text>
                <Text style={styles.infoValue}>{item.doffno}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Denier:</Text>
                <Text style={styles.infoValue}>{item.denier}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gross Qty:</Text>
                <Text style={styles.infoValue}>{item.totgrsqty}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Net Qty:</Text>
                <Text style={styles.infoValue}>{item.totnetqty}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cone Weight:</Text>
                <Text style={styles.infoValue}>{item.coneweight}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Start Time:</Text>
                <Text style={styles.infoValue}>{item.starttime}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>End Time:</Text>
                <Text style={styles.infoValue}>{item.endtime}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

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
    paddingVertical: 14,
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
    width: '48%',
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
    height: 52,
    backgroundColor: '#0F6C7B',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
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

  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },

  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
});
