// screens/NewCartonScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from "react-native-vector-icons/MaterialIcons";
import { fetchAllPropertyData, fetchAllYeardata, fetchAllStoredata } from '../../../common/API/Functions';
import { API } from '../../../common/API/dynamicAPI';
import Snackbar from 'react-native-snackbar';
import axios from 'axios';

const BLUE = '#0f8f9a';

const SectionTitle = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

const DropdownField = ({ label, value, required, onPress }) => (
  <View style={styles.formRow}>
    <Text style={styles.formLabel}>
      {label}{required && <Text style={styles.required}> *</Text>}
    </Text>
    <TouchableOpacity style={styles.dropdown} activeOpacity={0.8} onPress={onPress}>
      <Text style={value ? styles.dropdownText : styles.dropdownPlaceholder}>
        {value || 'Select...'}
      </Text>
      <Text style={styles.dropdownArrow}>▾</Text>
    </TouchableOpacity>
  </View>
);

const InputField = ({ label, value, onChangeText, required, placeholder, keyboardType }) => (
  <View style={styles.formRow}>
    <Text style={styles.formLabel}>
      {label}{required && <Text style={styles.required}> *</Text>}
    </Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || ''}
      placeholderTextColor="#bbb"
      keyboardType={keyboardType || 'default'}
    />
  </View>
);

export default function NewCartonScreen({ navigation, route, token }) {

  // ✅ RECEIVE criteriaForm from StockListScreen
  const criteriaForm = route?.params?.criteriaForm || {};
  const {
    property = '',
    year = '',
    store = '',
    updateStock = 0,
    autoFound = 0,
    manual = 0,
    stockNotFound = 0,
    autoNotFound = 0,
    autoForRepacking = 0,
    duplicate = 0,
  } = criteriaForm;
  const [form, setForm] = useState({
    PrpCode: criteriaForm?.PrpCode || '',
    YearNo: criteriaForm?.YearNo || '',
    StrCode: criteriaForm?.StrCode || '',
    StkType: criteriaForm?.StkType,
    ItmCode: '',
    MerCode: '',
    GrdCode: '',
    ShdCode: '',
    Denier: '',
    CartNo: '',
    Chees: '',
    grsWt: '',
    netWt: '',
  });

  const stockData = route?.params?.stockData || [];

  const [getAllPropertyData, setAllPropertyData] = useState([]);
  const [getAllYearData, setAllYearData] = useState([]);
  const [getAllStoreData, setAllStoreData] = useState([]);
  const [propertyVisible, setPropertyVisible] = useState(false);
  const [yearVisible, setYearVisible] = useState(false);
  const [storeVisible, setStoreVisible] = useState(false);
  const [stockTypeVisible, setStockTypeVisible] = useState(false);
  const [getStockTypesFilterForm, setStockTypesFilterForm] = useState([
    { 'label': 'All', 'value': 'A' },
    { 'label': 'In house', 'value': 'I' },
    { 'label': 'Process house', 'value': 'P' }
  ]);
  const [itemVisible, setItemVisible] = useState(false);
  const [mergeVisible, setMergeVisible] = useState(false);
  const [gradeVisible, setGradeVisible] = useState(false);
  const [shadeVisible, setShadeVisible] = useState(false);
  const [itemData, setItemData] = useState([]);
  const [mergeData, setMergeData] = useState([]);
  const [gradeData, setGradeData] = useState([]);
  const [shadeData, setShadeData] = useState([]);
  const [getAllStockDataInserted, setAllStockDataInserted] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [shadeLoading, setShadeLoading] = useState(false);


  const getToken = () => {
    return token;
  };

  let cancelToken: any;
  const getRequestConfig = (props: any) => ({
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    params: props.params,
    cancelToken: cancelToken?.token,
  });

  useEffect(() => {
    const loadProperty = async () => {
      const allprpdata = await fetchAllPropertyData(token);
      setAllPropertyData(allprpdata);
    };
    loadProperty();
  }, []);

  useEffect(() => {
    if (typeof form.PrpCode != 'undefined' && form.PrpCode != null && form.PrpCode != '') {
      const testFinct = async () => {
        const allyeardata = await fetchAllYeardata(token, form.PrpCode)
        setAllYearData(allyeardata)
      }
      testFinct();
    }
  }, [form.PrpCode])

  useEffect(() => {
    if (typeof form.YearNo != 'undefined' && form.YearNo != null && form.YearNo != '') {
      const testFinctStore = async () => {
        const allstoredata = await fetchAllStoredata(token, form.PrpCode, form.YearNo)
        setAllStoreData(allstoredata)
      }
      testFinctStore();
    }
  }, [form.YearNo])

  const getAllItems = async (token: string) => {
    if (cancelToken?.cancel) cancelToken.cancel();
    cancelToken = axios.CancelToken.source();
    setItemLoading(true);
    try {
      const historyPayload = {
        prpcode: form.PrpCode,
        yearno: form.YearNo,
        strcode: form.StrCode,
        itemcode: '',
        itemname: '',
        isall: '1',
        txntype: 'yarnStockVerification',
        billdate: '',
        ttype: ['8', '3', '30', '2', '34', '83', '42'],
        fetch: ''
      };
      const response = await axios.get(
        `${API}/api/itemdrop`, getRequestConfig(
          {
            params: { ...historyPayload }
          }
        )
      );
      console.log("response item", response)
      if (response.data.response.data.length > 0) {
        //setItemData(response.data.response.data);
        const itmdt = response.data.response.data
        return itmdt;
      } else {
        return [];
      }
    } catch (error) {
      console.log("item API error:", error);
    } finally {
      setItemLoading(false)
    }
  }
  const getAllMerges = async (token: string) => {
    if (cancelToken?.cancel) cancelToken.cancel();
    cancelToken = axios.CancelToken.source();
    setMergeLoading(true);
    try {
      const historyPayload = {
        prpcode: form.PrpCode,
        yearno: form.YearNo,
        strcode: form.StrCode,
        itemcode: '',
        itemname: '',
        isall: 1,
        txntype: 'yarnStockVerification',
        billdate: ''
      };

      const response = await axios.get(
        `${API}/api/mergedrop`, getRequestConfig(
          {
            params: { ...historyPayload }
          }
        )
      );

      if (response.data.response.data.length > 0) {
        //setMergeData(response.data.response.data);
        const merdt = response.data.response.data
        return merdt;
      } else {
        return [];
      }
    } catch (error) {
      console.log("shade API error:", error);
    } finally {
      setMergeLoading(false)
    }
  }
  const getAllGrades = async (token: string) => {
    if (cancelToken?.cancel) cancelToken.cancel();
    cancelToken = axios.CancelToken.source();
    setGradeLoading(true);
    try {
      const historyPayload = {
        prpcode: form.PrpCode,
        yearno: form.YearNo,
        strcode: form.StrCode,
        itemcode: '',
        itemname: '',
        isall: 1,
        txntype: 'yarnStockVerification',
        billdate: '',
        ttype: ['8', '3', '30', '2', '34', '83', '42'],
        fetch: 'grade',

      };
      const response = await axios.get(
        `${API}/api/gradedrop`, getRequestConfig(
          {
            params: { ...historyPayload }
          }
        )
      );
      if (response.data.response.data.length > 0) {
        //setGradeData(response.data.response.data);
        const grddt = response.data.response.data
        return grddt
      } else {
        //etGradeData([]);
        return []
      }
    } catch (error) {
      console.log("grade API error:", error);
    } finally {
      setGradeLoading(false)
    }
  }

  const getAllShades = async (token: string) => {
    if (cancelToken?.cancel) cancelToken.cancel();
    cancelToken = axios.CancelToken.source();
    setShadeLoading(true);
    try {
      const historyPayload = {
        prpcode: form.PrpCode,
        yearno: form.YearNo,
        strcode: form.StrCode,
        itemcode: '',
        itemname: '',
        isall: 1,
        txntype: 'yarnStockVerification',
        billdate: ''
      };
      const response = await axios.get(
        `${API}/api/shadedrop`, getRequestConfig(
          {
            params: { ...historyPayload }
          }
        )
      );
      if (response.data.response.data.length > 0) {
        //setShadeData(response.data.response.data);
        const shddt = response.data.response.data
        return shddt
      } else {
        //setShadeData([]);
        return []
      }
    } catch (error) {
      console.log("grade API error:", error);
    } finally {
      setShadeLoading(false)
    }
  }

  const ModalSkeleton = () => (
    <View style={{ padding: 15 }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <View
          key={i}
          style={{
            height: 55,
            backgroundColor: '#E5E7EB',
            borderRadius: 8,
            marginBottom: 10,
          }}
        />
      ))}
    </View>
  );

  useEffect(() => {
    const loadAllFunctions = async () => {
      if (form.PrpCode && form.YearNo && form.StrCode) {
        const itmdata = await getAllItems(token);
        setItemData(itmdata || []);

        const merdata = await getAllMerges(token);
        setMergeData(merdata || []);

        const grdata = await getAllGrades(token);
        setGradeData(grdata || []);

        const shdata = await getAllShades(token);
        setShadeData(shdata || []);
      }
    };

    loadAllFunctions();
  }, [form.PrpCode, form.YearNo, form.StrCode]);

  const DropdownField = ({ label, value, required, onPress }) => (
    <View style={styles.formRow}>
      <Text style={styles.formLabel}>
        {label}{required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity style={styles.dropdown} activeOpacity={0.8} onPress={onPress}>
        <Text style={value ? styles.dropdownText : styles.dropdownPlaceholder}>
          {value || 'Select...'}
        </Text>
        <Text style={styles.dropdownArrow}>▾</Text>
      </TouchableOpacity>
    </View>
  );

  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleStockData = async (newdata) => {
    setLoading(true)
    const payload = {
      prptype: 'S',
      prpcodes: [form.PrpCode],
      yearno: form.YearNo,
      strcode: form.StrCode,
      updateStock: criteriaForm.updateStock,
      autoFound: typeof criteriaForm.autoFound == 'undefined' || criteriaForm.autoFound == null || criteriaForm.autoFound == '' ? '0' : criteriaForm.autoFound,
      manual: typeof criteriaForm.manual == 'undefined' || criteriaForm.manual == null || criteriaForm.manual == '' ? '0' : criteriaForm.manual,
      stockNotFound: typeof criteriaForm.stockNotFound == 'undefined' || criteriaForm.stockNotFound == null || criteriaForm.stockNotFound == '' ? '0' : criteriaForm.stockNotFound,
      autoNotFound: typeof criteriaForm.autoNotFound == 'undefined' || criteriaForm.autoNotFound == null || criteriaForm.autoNotFound == '' ? '0' : criteriaForm.autoNotFound,
      autoForRepacking: typeof criteriaForm.autoForRepacking == 'undefined' || criteriaForm.autoForRepacking == null || criteriaForm.autoForRepacking == '' ? '0' : criteriaForm.autoForRepacking,
      duplicate: typeof criteriaForm.duplicate == 'undefined' || criteriaForm.duplicate == null || criteriaForm.duplicate == '' ? '0' : criteriaForm.duplicate,
      txntype: 'yarnStockVerification',
      stktype: typeof criteriaForm.StkType != 'undefined' && criteriaForm.StkType != null && criteriaForm.StkType != '' ? criteriaForm.StkType : '',
    };
    const headers = {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'X-Requested-with': 'XMLHttpRequest',
    };
    console.log('get_verify_manual_stock API payload : ', payload)
    console.log('get_verify_manual_stock API URL : ', `${API}/api/get_verify_manual_stock`)
    try {
      const response = await axios.post(`${API}/api/get_verify_manual_stock`, payload, { headers });
      console.log('get_verify_manual_stock API response : ', response)

      if (response.data.success === true && response.data.response.data.length === 0) {

        Alert.alert('No Data Found');
      } else if (response.data.success === true && response.data.response.data.length > 0) {
        if (newdata && newdata.length > 0) {

          let cartons = [];
          newdata && newdata.filter((el, ind) => {
            cartons.push(el.CartNo);
          })

          let finalrespo = []
          let finalrespoCntr = 0
          response.data.response.data && response.data.response.data.filter((el, ind) => {
            if (!cartons.includes(el.CartNo)) {
              finalrespo[finalrespoCntr] = el
              finalrespoCntr++;
            }
          })
          const alldt = newdata.concat(finalrespo);

          navigation.navigate('StockList', {
            criteriaForm,
            stockData: alldt,
          });
        } else {
          navigation.navigate('StockList', {
            criteriaForm,
            stockData: response.data.response.data,
          });
        }
      } else if (response.data.success === false) {

        Alert.alert(`${response.data.message}`);
      } else {

        Alert.alert(`${response.data.message}`);
      }
    } catch (error) {
      Alert.alert('Server Error :' + error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCarton = async () => {
    if (typeof form.PrpCode == 'undefined' || form.PrpCode == null || form.PrpCode == '') {
      Snackbar.show({
        text: 'Please select property',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: 'white' },
      });
    } else if (typeof form.YearNo == 'undefined' || form.YearNo == null || form.YearNo == '') {
      Snackbar.show({
        text: 'Please select year',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: 'white' },
      });
    } else if (typeof form.StrCode == 'undefined' || form.StrCode == null || form.StrCode == '') {
      Snackbar.show({
        text: 'Please select store',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: 'white' },
      });
    } else if (typeof form.CartNo == 'undefined' || form.CartNo == null || form.CartNo == '') {
      Snackbar.show({
        text: 'Carton no. can not be balnk or empty',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: 'white' },
      });
    } else if (typeof form.Chees == 'undefined' || form.Chees == null || form.Chees == '' || parseFloat(form.Chees) <= 0) {
      Snackbar.show({
        text: 'Chees can not be balnk or empty or 0',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: 'white' },
      });
    } else if (typeof form.ItmCode == 'undefined' || form.ItmCode == null || form.ItmCode == '') {
      Snackbar.show({
        text: 'Item can not be balnk or empty',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: 'white' },
      });
    } else if (typeof form.MerCode == 'undefined' || form.MerCode == null || form.MerCode == '') {
      Snackbar.show({
        text: 'Merge can not be balnk or empty',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: 'white' },
      });
    } else if (typeof form.GrdCode == 'undefined' || form.GrdCode == null || form.GrdCode == '') {
      Snackbar.show({
        text: 'Grade can not be balnk or empty',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: 'white' },
      });
    } else if (typeof form.ShdCode == 'undefined' || form.ShdCode == null || form.ShdCode == '') {
      Snackbar.show({
        text: 'Shade can not be balnk or empty',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: 'white' },
      });
    } else if (typeof form.Denier == 'undefined' || form.Denier == null || form.Chees == '') {
      Snackbar.show({
        text: 'Denier can not be balnk or empty or 0',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: 'white' },
      });
    }
    // else if (typeof FormCartonDataState.values.grsWt == 'undefined' || FormCartonDataState.values.grsWt == null || FormCartonDataState.values.grsWt == '' || parseFloat(FormCartonDataState.values.grsWt) <= 0) {
    //     Snackbar.show({
    //         text: 'Gross wt. can not be balnk or empty or 0',
    //         duration: Snackbar.LENGTH_LONG,
    //         backgroundColor: 'red',
    //         textColor: '#fff',
    //         action: { text: 'OK', textColor: 'white' },
    //     });
    // } 
    else if (typeof form.netWt == 'undefined' || form.netWt == null || form.netWt == '' || parseFloat(form.netWt) <= 0) {
      Snackbar.show({
        text: 'Net wt. can not be balnk or empty or 0',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: 'white' },
      });
    } else if (typeof form.StkType == 'undefined' || form.StkType == null || form.StkType == '') {
      Snackbar.show({
        text: 'Please select stock type',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: 'white' },
      });
    } else {
      setLoading(true)
      const payload = {
        prptype: 'S',
        prpcodes: [form.PrpCode],
        yearno: form.YearNo,
        strcode: form.StrCode,
        CartNo: form.CartNo,
        Chees: form.Chees,
        ItmCode: form.ItmCode,
        MerCode: form.MerCode,
        GrdCode: form.GrdCode,
        ShdCode: form.ShdCode,
        Denier: form.Denier,
        GrsWt: form.grsWt,
        NetWt: form.netWt,
        StkType: form.StkType,
        txntype: 'yarnStockVerification'
      };

      console.log("payload", payload);

      const headers = {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'X-Requested-with': 'XMLHttpRequest',
      };
      console.log("insert_verify_manual_stock api payload :", payload)
      console.log("insert_verify_manual_stock api url :", `${API}/api/insert_verify_manual_stock`)
      try {
        const response = await axios.post(`${API}/api/insert_verify_manual_stock`, payload, { headers });
        if (response.data.success === true && response.data.data.length === 0) {
          Alert.alert('No Data Found');
        } else if (response.data.success === true && response.data.data.length > 0) {
          setAllStockDataInserted(getAllStockDataInserted => [...getAllStockDataInserted, response.data.data[0]])
          const mergedata = response.data.data.concat(getAllStockDataInserted);
          handleStockData(mergedata)
          //onClose()
        } else if (response.data.success === false) {
          Alert.alert(`${response.data.message}`);
        } else {
          Alert.alert(`${response.data.message}`);
        }
      } catch (error) {
        Alert.alert('Server Error :' + error)
      } finally {
        //setLoading(false)
      }
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar backgroundColor={BLUE} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon
            name="arrow-back-ios"
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Carton</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <SectionTitle title="Stock Information" />
          <DropdownField
            label="Property"
            value={
              getAllPropertyData.find(
                x => x.PrpCode === form.PrpCode
              )?.PrpName || ''
            }
            onPress={() => setPropertyVisible(true)}
          />

          <DropdownField
            label="Year"
            value={
              getAllYearData.find(
                x => x.YearNo === form.YearNo
              )?.YearName || ''
            }
            onPress={() => setYearVisible(true)}
          />

          <DropdownField
            label="Store"
            value={
              getAllStoreData.find(
                x => x.StrCode === form.StrCode
              )?.StrName || ''
            }
            onPress={() => setStoreVisible(true)}
          />

          <DropdownField
            label="Stock Type"
            value={
              getStockTypesFilterForm.find(
                x => x.value === form.StkType
              )?.label || ''
            }
            onPress={() => setStockTypeVisible(true)}
          />
        </View>

        {/* Yarn Details */}
        <View style={styles.card}>
          <DropdownField
            label="Item"
            value={
              itemData.find(x => x.ItmCode === form.ItmCode)?.ItmName || ''
            }
            required
            onPress={() => setItemVisible(true)}
          />

          <DropdownField
            label="Merge"
            value={
              mergeData.find(x => x.MerCode === form.MerCode)?.MerName || ''
            }
            required
            onPress={() => setMergeVisible(true)}
          />

          <DropdownField
            label="Grade"
            value={
              gradeData.find(x => x.GrdCode === form.GrdCode)?.GrdName || ''
            }
            required
            onPress={() => setGradeVisible(true)}
          />

          <DropdownField
            label="Shade"
            value={
              shadeData.find(x => x.ShdCode === form.ShdCode)?.ShdName || ''
            }
            required
            onPress={() => setShadeVisible(true)}
          />
          <InputField
            label="Denier"
            value={form.Denier}
            onChangeText={set('Denier')}
            required
            keyboardType="numeric"
          />
        </View>

        {/* Quantity Details */}
        <View style={styles.card}>
          <SectionTitle title="Quantity Details" />

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Carton No *</Text>
            <View style={styles.inputWithClear}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0 }]}
                value={form.CartNo}
                onChangeText={set('CartNo')}
              />
              <TouchableOpacity onPress={() => set('CartNo')('')} style={styles.clearBtn}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.doubleRow}>
            <View style={[styles.formRow, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.formLabel}>Chees <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={form.Chees}
                onChangeText={set('Chees')}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.formRow, { flex: 1 }]}>
              <Text style={styles.formLabel}>Gross Wt (KG) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={form.grsWt}
                onChangeText={set('grsWt')}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Net Weight (KG) <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={form.netWt}
              onChangeText={set('netWt')}
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={handleSaveCarton}>
          <Text style={styles.saveBtnText}>SAVE CARTON</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal
        visible={propertyVisible}
        animationType="slide"
        onRequestClose={() => setPropertyVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Property</Text>

            <TouchableOpacity onPress={() => setPropertyVisible(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={getAllPropertyData}
            keyExtractor={(item) => item.PrpCode}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItemNew,
                  form.PrpCode === item.PrpCode && styles.selectedItem,
                ]}
                onPress={() => {
                  setForm(prev => ({
                    ...prev,
                    PrpCode: item.PrpCode,
                    YearNo: '',
                    StrCode: '',
                  }));
                  setPropertyVisible(false);
                }}
              >
                <Text style={styles.itemText}>
                  {item.PrpName}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <Modal
        visible={yearVisible}
        animationType="slide"
        onRequestClose={() => setYearVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Year</Text>

            <TouchableOpacity onPress={() => setYearVisible(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={getAllYearData}
            keyExtractor={(item) => item.YearNo}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItemNew,
                  form.YearNo === item.YearNo && styles.selectedItem,
                ]}
                onPress={() => {
                  setForm(prev => ({
                    ...prev,
                    YearNo: item.YearNo,
                    StrCode: '',
                  }));
                  setYearVisible(false);
                }}
              >
                <Text style={styles.itemText}>
                  {item.YearName}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <Modal
        visible={storeVisible}
        animationType="slide"
        onRequestClose={() => setStoreVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Store</Text>

            <TouchableOpacity onPress={() => setStoreVisible(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={getAllStoreData}
            keyExtractor={(item) => item.StrCode}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItemNew,
                  form.StrCode === item.StrCode && styles.selectedItem,
                ]}
                onPress={() => {
                  setForm(prev => ({
                    ...prev,
                    StrCode: item.StrCode,
                  }));
                  setStoreVisible(false);
                }}
              >
                <Text style={styles.itemText}>
                  {item.StrName}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <Modal
        visible={stockTypeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStockTypeVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setStockTypeVisible(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              width: '80%',
              backgroundColor: '#fff',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 15,
                paddingVertical: 14,
                backgroundColor: '#0B6B6F',
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: '700',
                }}
              >
                Select Stock Type
              </Text>

              <TouchableOpacity
                onPress={() => setStockTypeVisible(false)}
              >
                <Icon
                  name="close"
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>

            {getStockTypesFilterForm.map(item => (
              <TouchableOpacity
                key={item.value}
                style={{
                  paddingVertical: 15,
                  paddingHorizontal: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#eee',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor:
                    form.StkType === item.value
                      ? '#E8F5F5'
                      : '#fff',
                }}
                onPress={() => {
                  setForm(prev => ({
                    ...prev,
                    StkType: item.value,
                  }));
                  setStockTypeVisible(false);
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: '#222',
                    fontWeight: '500',
                  }}
                >
                  {item.label}
                </Text>

                {form.StkType === item.value && (
                  <Icon
                    name="check-circle"
                    size={20}
                    color="#0B6B6F"
                  />
                )}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>


      <Modal visible={itemVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Item</Text>

            <TouchableOpacity
              onPress={() => setItemVisible(false)}
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {itemLoading ? (
            <ModalSkeleton />
          ) : (
            <FlatList
              data={itemData}
              keyExtractor={(item) => item.ItmCode}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItemNew}
                  onPress={() => {
                    setForm(prev => ({
                      ...prev,
                      ItmCode: item.ItmCode,
                      Denier: item.Denier
                    }));
                    setItemVisible(false);
                  }}
                >
                  <Text style={styles.itemText}>
                    {item.ItmName}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
      <Modal visible={mergeVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Merge</Text>

            <TouchableOpacity
              onPress={() => setMergeVisible(false)}
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {mergeLoading ? (
            <ModalSkeleton />
          ) : (
            <FlatList
              data={mergeData}
              keyExtractor={(item) => item.MerCode}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItemNew}
                  onPress={() => {
                    setForm(prev => ({
                      ...prev,
                      MerCode: item.MerCode,
                    }));
                    setMergeVisible(false);
                  }}
                >
                  <Text style={styles.itemText}>
                    {item.MerName}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
      <Modal visible={gradeVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Grade</Text>

            <TouchableOpacity
              onPress={() => setGradeVisible(false)}
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {gradeLoading ? (
            <ModalSkeleton />
          ) : (
            <FlatList
              data={gradeData}
              keyExtractor={(item) => item.GrdCode}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItemNew}
                  onPress={() => {
                    setForm(prev => ({
                      ...prev,
                      GrdCode: item.GrdCode,
                    }));
                    setGradeVisible(false);
                  }}
                >
                  <Text style={styles.itemText}>
                    {item.GrdName}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      <Modal visible={shadeVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Shade</Text>

            <TouchableOpacity
              onPress={() => setShadeVisible(false)}
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {shadeLoading ? (
            <ModalSkeleton />
          ) : (
            <FlatList
              data={shadeData}
              keyExtractor={(item) => item.ShdCode}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItemNew}
                  onPress={() => {
                    setForm(prev => ({
                      ...prev,
                      ShdCode: item.ShdCode,
                    }));
                    setShadeVisible(false);
                  }}
                >
                  <Text style={styles.itemText}>
                    {item.ShdName}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F4F8' },
  header: {
    backgroundColor: '#0f8f9a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  backBtn: { marginRight: 12 },
  backIcon: { color: '#fff', fontSize: 22, fontWeight: '300' },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: { padding: 14, paddingBottom: 36 },

  // Options banner
  optionsBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
  },
  optionsBannerTitle: { fontSize: 11, fontWeight: '700', color: '#555', marginBottom: 8 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  optChipOn: { backgroundColor: '#E6F9ED' },
  optChipOff: { backgroundColor: '#FFE8E8' },
  optChipText: { fontSize: 11, fontWeight: '600' },
  optChipTextOn: { color: '#27AE60' },
  optChipTextOff: { color: '#E53935' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BLUE,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0FA',
  },
  formRow: { marginBottom: 10 },
  formLabel: { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: '500' },
  required: { color: '#E53935' },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D5E8',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: '#FAFBFF',
  },
  dropdownText: { fontSize: 13, color: '#222', flex: 1 },
  dropdownPlaceholder: { fontSize: 13, color: '#bbb', flex: 1 },
  dropdownArrow: { fontSize: 13, color: '#888' },
  input: {
    borderWidth: 1,
    borderColor: '#D0D5E8',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    fontSize: 13,
    color: '#222',
    backgroundColor: '#FAFBFF',
  },
  inputWithClear: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D0D5E8',
    borderRadius: 6,
    backgroundColor: '#FAFBFF',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  clearBtn: { padding: 4 },
  clearText: { color: '#bbb', fontSize: 13 },
  doubleRow: { flexDirection: 'row' },
  saveBtn: {
    backgroundColor: BLUE,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 1 },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0B6B6F',
    paddingHorizontal: 15,
    paddingVertical: 14,
  },

  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  modalItemNew: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  itemText: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
  },
});
