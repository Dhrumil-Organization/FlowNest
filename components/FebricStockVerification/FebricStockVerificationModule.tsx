import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  StatusBar,
  Modal,
  FlatList,
  Alert,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
// import { API, PRINTSTICKER } from '../../../common/API/dynamicAPI'
import { API, PRINTSTICKER } from '@/common/API/dynamicAPI';
// import { fetchAllPropertyData, fetchAllYeardata, fetchAllStoredata } from '../../../common/API/Functions';
import { fetchAllPropertyData, fetchAllYeardata, fetchAllStoredata } from '@/common/API/Functions';
// import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Snackbar } from 'react-native-snackbar';
// Unified criteria view

const CRITERIA_BLUE = '#2148C8';
const HEADER_BG = '#1A3DB8';

// ─── Single unified form state ───────────────────────────────────────────────
// Toggle options use  1 = checked (ON)  /  0 = unchecked (OFF)
const INITIAL_FORM_STATE = {
  // Selection Criteria
  property: 'TEXPROCIL PVT. LTD.',
  year: '2025 - 2026',
  store: 'MAIN STORE',

  // Options  →  1 = ON, 0 = OFF
  updateStock: 1,
  autoFound: 1,
  manual: 1,
  stockNotFound: 1,
  autoNotFound: 1,
  autoForRepacking: 1,
  duplicate: 1,
};

// ─── Reusable sub-components ─────────────────────────────────────────────────

const CriteriaDropdownField = ({ label, value, onPress }) => (
  <View style={criteriaStyles.fieldRow}>
    <Text style={criteriaStyles.fieldLabel}>{label}</Text>
    <TouchableOpacity style={criteriaStyles.dropdown} activeOpacity={0.8} onPress={onPress}>
      <Text style={criteriaStyles.dropdownText}>{value}</Text>
      <Text style={criteriaStyles.dropdownArrow}>▾</Text>
    </TouchableOpacity>
  </View>
);

// value is 0 or 1  — Switch needs a boolean, so we convert with === 1
const CriteriaToggleRow = ({ label, value, onToggle }) => (
  <View style={criteriaStyles.toggleRow}>
    <Text style={criteriaStyles.toggleLabel}>{label}</Text>
    <View style={criteriaStyles.toggleRight}>
      {/* <Text style={[criteriaStyles.toggleBadge, value === 1 ? criteriaStyles.badgeOn : criteriaStyles.badgeOff]}>
                {value === 1 ? '1' : '0'}
            </Text> */}
      <Switch
        value={value === 1}
        onValueChange={onToggle}
        trackColor={{ false: '#ccc', true: '#4CAF50' }}
        thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
        ios_backgroundColor="#ccc"
      />
    </View>
  </View>
);

// ─── Screen ──────────────────────────────────────────────────────────────────

function CriteriaView({ navigation, token }) {
  // const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const router = useRouter();
  const [getStockTypesFilterForm, setStockTypesFilterForm] = useState([
    { 'label': 'All', 'value': 'A' },
    { 'label': 'In house', 'value': 'I' },
    { 'label': 'Process house', 'value': 'P' }
  ]);
  const [formState, setFormState] = useState({
    PrpCode: '',
    YearNo: '',
    StrCode: '',
    updateStock: 1,
    autoFound: 1,
    manual: 1,
    stockNotFound: 1,
    autoNotFound: 1,
    autoForRepacking: 1,
    duplicate: 1,
    StkType: ''
  });

  const [getAllPropertyData, setAllPropertyData] = useState([]);
  const [getAllYearData, setAllYearData] = useState([]);
  const [getAllStoreData, setAllStoreData] = useState([]);
  const [propertyVisible, setPropertyVisible] = useState(false);
  const [yearVisible, setYearVisible] = useState(false);
  const [storeVisible, setStoreVisible] = useState(false);
  const [stockTypeVisible, setStockTypeVisible] = useState(false);


  const getToken = () => {
    return token;
  };


  const setField = (key, value) =>
    setFormState((prev) => ({ ...prev, [key]: value }));


  const toggleField = (key) =>
    setFormState((prev) => ({ ...prev, [key]: prev[key] === 1 ? 0 : 1 }));


  useEffect(() => {
    if (!token) {
      console.log('Property API skipped: token not available');
      return;
    }

    let mounted = true;

    const loadProperty = async () => {
      try {
        const allprpdata = await fetchAllPropertyData(token);

        if (!mounted) return;

        setAllPropertyData(allprpdata || []);
      } catch (error) {
        console.log('Property API error:', error);
        if (mounted) setAllPropertyData([]);
      }
    };

    loadProperty();

    return () => {
      mounted = false;
    };
  }, [token]);



  useEffect(() => {
    if (!token || !formState.PrpCode) return;

    let mounted = true;

    const loadYear = async () => {
      try {
        const allyeardata = await fetchAllYeardata(token, formState.PrpCode);
        if (mounted) setAllYearData(allyeardata || []);
      } catch (error) {
        console.log('Year API error:', error);
        if (mounted) setAllYearData([]);
      }
    };

    loadYear();

    return () => {
      mounted = false;
    };
  }, [token, formState.PrpCode]);


  useEffect(() => {
    if (!token || !formState.PrpCode || !formState.YearNo) return;

    let mounted = true;

    const loadStore = async () => {
      try {
        const allstoredata = await fetchAllStoredata(
          token,
          formState.PrpCode,
          formState.YearNo
        );
        if (mounted) setAllStoreData(allstoredata || []);
      } catch (error) {
        console.log('Store API error:', error);
        if (mounted) setAllStoreData([]);
      }
    };

    loadStore();

    return () => {
      mounted = false;
    };
  }, [token, formState.PrpCode, formState.YearNo]);


  // Navigate and pass the entire formState as a param
  const handleLoadStock = async () => {
    try {

      const payload = {
        prptype: 'S',
        prpcodes: [formState.PrpCode],
        yearno: formState.YearNo,
        strcode: formState.StrCode,

        updateStock: formState.updateStock,
        autoFound: formState.autoFound,
        manual: formState.manual,
        stockNotFound: formState.stockNotFound,
        autoNotFound: formState.autoNotFound,
        autoForRepacking: formState.autoForRepacking,
        duplicate: formState.duplicate,
        txntype: 'fabricStockVerification',
        stktype: formState.StkType || 'I',
      };

      const headers = {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'X-Requested-with': 'XMLHttpRequest',
      };

      console.log('payload =>', payload);

      const response = await axios.post(
        `${API}/api/get_verify_manual_fabric_stock`,
        payload,
        { headers }
      );

      console.log('response =>', response.data);

      if (
        response?.data?.success === true &&
        response?.data?.response?.data?.length > 0
      ) {
        navigation.navigate('FabricStockVerification', {
          mode: 'browse',
          criteriaForm: formState,
          stockData: response.data.response.data,
        });
      } else {
        Alert.alert('No Data Found');
      }

    } catch (error) {
      console.log(error);
      Alert.alert('Server Error');
    }
  };


  // const handleLoadStock = async () => {

  //     const staticData = [
  //         {
  //             UId: "100001",
  //             CartNo: "CTN0001",
  //             ItmName: "40s Cotton Yarn",
  //             MerName: "Cotton",
  //             GrdName: "A Grade",
  //             ShdName: "White",
  //             Chees: 24,
  //             Denier: 150,
  //             StkType: "Manual",
  //             UsrCode: "ADMIN",
  //             TranDate: "20250616",
  //             Wt: 48.75,
  //             IsAuto: "No",
  //             TranName: "Manual Verification",
  //             Status: "1"
  //         },
  //         {
  //             UId: "100002",
  //             CartNo: "CTN0002",
  //             ItmName: "60s Cotton Yarn",
  //             MerName: "Polyester",
  //             GrdName: "B Grade",
  //             ShdName: "Black",
  //             Chees: 30,
  //             Denier: 200,
  //             StkType: "Auto Found",
  //             UsrCode: "USER01",
  //             TranDate: "20250615",
  //             Wt: 52.25,
  //             IsAuto: "Yes",
  //             TranName: "Auto Verification",
  //             Status: "2"
  //         }
  //     ];

  //     navigation.navigate('FabricStockVerification', { mode: 'browse',
  //         criteriaForm: formState,
  //         stockData: staticData,
  //     });
  // };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView style={criteriaStyles.safeArea} edges={['top']}>
      <StatusBar backgroundColor={'#0f8f9a'} barStyle="light-content" />

      {/* Header */}
      <View style={criteriaStyles.header}>
        <TouchableOpacity
          onPress={() => goBack()}
          activeOpacity={0.8}
        >
          <Icon
            name="arrow-back-ios"
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={criteriaStyles.headerTitle}>Fabric Stock Verification</Text>
      </View>

      <ScrollView contentContainerStyle={criteriaStyles.body} showsVerticalScrollIndicator={false}>

        {/* ── Selection Criteria ── */}
        <View style={criteriaStyles.card}>
          <Text style={criteriaStyles.sectionTitle}>Selection Criteria</Text>

          <CriteriaDropdownField
            label="Property"
            value={
              getAllPropertyData.find(
                x => x.PrpCode === formState.PrpCode
              )?.PrpName || ''
            }
            onPress={() => setPropertyVisible(true)}
          />

          <CriteriaDropdownField
            label="Year"
            value={
              getAllYearData.find(
                x => x.YearNo === formState.YearNo
              )?.YearName || ''
            }
            onPress={() => setYearVisible(true)}
          />

          <CriteriaDropdownField
            label="Store"
            value={
              getAllStoreData.find(
                x => x.StrCode === formState.StrCode
              )?.StrName || ''
            }
            onPress={() => setStoreVisible(true)}
          />

          <CriteriaDropdownField
            label="Stock Type"
            value={
              getStockTypesFilterForm.find(
                x => x.value === formState.StkType
              )?.label || ''
            }
            onPress={() => setStockTypeVisible(true)}
          />

        </View>

        {/* ── Options (toggles) ── */}
        <View style={criteriaStyles.card}>
          <Text style={[criteriaStyles.sectionTitle, { color: '#000' }]}>Options</Text>

          <CriteriaToggleRow
            label="Update Stock"
            value={formState.updateStock}
            onToggle={() => toggleField('updateStock')}
          />
          <CriteriaToggleRow
            label="Auto Found"
            value={formState.autoFound}
            onToggle={() => toggleField('autoFound')}
          />
          <CriteriaToggleRow
            label="Manual"
            value={formState.manual}
            onToggle={() => toggleField('manual')}
          />
          <CriteriaToggleRow
            label="Stock Not Found"
            value={formState.stockNotFound}
            onToggle={() => toggleField('stockNotFound')}
          />
          <CriteriaToggleRow
            label="Auto Not Found"
            value={formState.autoNotFound}
            onToggle={() => toggleField('autoNotFound')}
          />
          <CriteriaToggleRow
            label="Auto For Repacking"
            value={formState.autoForRepacking}
            onToggle={() => toggleField('autoForRepacking')}
          />
          <CriteriaToggleRow
            label="Duplicate"
            value={formState.duplicate}
            onToggle={() => toggleField('duplicate')}
          />
        </View>

        {/* ── Load Stock ── */}
        <TouchableOpacity
          style={criteriaStyles.loadBtn}
          activeOpacity={0.85}
          onPress={handleLoadStock}
        >
          <Text style={criteriaStyles.loadBtnText}>LOAD STOCK</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal
        visible={propertyVisible}
        animationType="slide"
        onRequestClose={() => setPropertyVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 15,
              paddingVertical: 15,
              borderBottomWidth: 1,
              borderBottomColor: '#ddd',
              backgroundColor: '#0B6B6F',
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#fff',
              }}
            >
              Select Property
            </Text>

            <TouchableOpacity
              onPress={() => setPropertyVisible(false)}
            >
              <Icon
                name="close"
                size={26}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Property List */}
          <FlatList
            data={getAllPropertyData}
            keyExtractor={(item) => item.PrpCode}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  paddingVertical: 18,
                  paddingHorizontal: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: '#eee',
                  backgroundColor:
                    formState.PrpCode === item.PrpCode
                      ? '#E8F5F5'
                      : '#fff',
                }}
                onPress={() => {
                  setFormState(prev => ({
                    ...prev,
                    PrpCode: item.PrpCode,
                    YearNo: '',
                    StrCode: '',
                  }));

                  setPropertyVisible(false);
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#000',
                  }}
                >
                  {item.PrpName}
                </Text>

                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: '#000',
                  }}
                >
                  {item.PrpCode}
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

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 15,
              paddingVertical: 15,
              backgroundColor: '#0B6B6F',
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#fff',
              }}
            >
              Select Year
            </Text>

            <TouchableOpacity onPress={() => setYearVisible(false)}>
              <Icon name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={getAllYearData}
            keyExtractor={(item) => item.YearNo}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  paddingVertical: 18,
                  paddingHorizontal: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: '#eee',
                  backgroundColor:
                    formState.YearNo === item.YearNo
                      ? '#E8F5F5'
                      : '#fff',
                }}
                onPress={() => {
                  setFormState(prev => ({
                    ...prev,
                    YearNo: item.YearNo,
                    StrCode: '',
                  }));
                  setYearVisible(false);
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#000',
                  }}
                >
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

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 15,
              paddingVertical: 15,
              backgroundColor: '#0B6B6F',
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#fff',
              }}
            >
              Select Store
            </Text>

            <TouchableOpacity onPress={() => setStoreVisible(false)}>
              <Icon name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={getAllStoreData}
            keyExtractor={(item) => item.StrCode}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  paddingVertical: 18,
                  paddingHorizontal: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: '#eee',
                  backgroundColor:
                    formState.StrCode === item.StrCode
                      ? '#E8F5F5'
                      : '#fff',
                }}
                onPress={() => {
                  setFormState(prev => ({
                    ...prev,
                    StrCode: item.StrCode,
                  }));
                  setStoreVisible(false);
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#000',
                  }}
                >
                  {item.StrName}
                </Text>

                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: '#000',
                  }}
                >
                  {item.StrCode}
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
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.3)',
            justifyContent: 'center',
            paddingHorizontal: 20,
          }}
          activeOpacity={1}
          onPress={() => setStockTypeVisible(false)}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {getStockTypesFilterForm.map(item => (
              <TouchableOpacity
                key={item.value}
                style={{
                  paddingVertical: 15,
                  paddingHorizontal: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#eee',
                }}
                onPress={() => {
                  setFormState(prev => ({
                    ...prev,
                    StkType: item.value,
                  }));
                  setStockTypeVisible(false);
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: '#000',
                    fontWeight:
                      formState.StkType === item.value
                        ? '700'
                        : '500',
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>

  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const criteriaStyles = StyleSheet.create({
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
  menuBtn: { marginRight: 14 },
  menuIcon: { color: '#fff', fontSize: 22 },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginBottom: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldLabel: {
    width: 72,
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D5E8',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FAFBFF',
  },
  dropdownText: { fontSize: 13, color: '#222', flex: 1 },
  dropdownArrow: { fontSize: 14, color: '#888', marginLeft: 6 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFEFEF',
  },
  toggleLabel: { fontSize: 14, color: '#333', flex: 1 },
  toggleRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  badgeOn: { backgroundColor: '#E6F9ED', color: '#27AE60' },
  badgeOff: { backgroundColor: '#FFE8E8', color: '#E53935' },
  loadBtn: {
    backgroundColor: '#0f8f9a',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    elevation: 3,
    shadowColor: '#0f8f9a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  loadBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
// Unified new-carton view

const NEW_CARTON_BLUE = '#0f8f9a';

const NewCartonSectionTitle = ({ title }) => (
  <Text style={newCartonStyles.sectionTitle}>{title}</Text>
);

const NewCartonDropdownField = ({ label, value, required, onPress }) => (
  <View style={newCartonStyles.formRow}>
    <Text style={newCartonStyles.formLabel}>
      {label}{required && <Text style={newCartonStyles.required}> *</Text>}
    </Text>
    <TouchableOpacity style={newCartonStyles.dropdown} activeOpacity={0.8} onPress={onPress}>
      <Text style={value ? newCartonStyles.dropdownText : newCartonStyles.dropdownPlaceholder}>
        {value || 'Select...'}
      </Text>
      <Text style={newCartonStyles.dropdownArrow}>▾</Text>
    </TouchableOpacity>
  </View>
);

const NewCartonInputField = ({ label, value, onChangeText, required, placeholder, keyboardType }) => (
  <View style={newCartonStyles.formRow}>
    <Text style={newCartonStyles.formLabel}>
      {label}{required && <Text style={newCartonStyles.required}> *</Text>}
    </Text>
    <TextInput
      style={newCartonStyles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || ''}
      placeholderTextColor="#bbb"
      keyboardType={keyboardType || 'default'}
    />
  </View>
);

function NewCartonView({ navigation, route, token }) {

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
    if (!token) {
      console.log('New Carton Property API skipped: token not available');
      return;
    }

    let mounted = true;

    const loadProperty = async () => {
      try {
        const allprpdata = await fetchAllPropertyData(token);
        if (mounted) setAllPropertyData(allprpdata || []);
      } catch (error) {
        console.log('New Carton Property API error:', error);
        if (mounted) setAllPropertyData([]);
      }
    };

    loadProperty();

    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !form.PrpCode) return;

    let mounted = true;

    const loadYear = async () => {
      try {
        const allyeardata = await fetchAllYeardata(token, form.PrpCode);
        if (mounted) setAllYearData(allyeardata || []);
      } catch (error) {
        console.log('New Carton Year API error:', error);
        if (mounted) setAllYearData([]);
      }
    };

    loadYear();

    return () => {
      mounted = false;
    };
  }, [token, form.PrpCode]);

  useEffect(() => {
    if (!token || !form.PrpCode || !form.YearNo) return;

    let mounted = true;

    const loadStore = async () => {
      try {
        const allstoredata = await fetchAllStoredata(
          token,
          form.PrpCode,
          form.YearNo
        );
        if (mounted) setAllStoreData(allstoredata || []);
      } catch (error) {
        console.log('New Carton Store API error:', error);
        if (mounted) setAllStoreData([]);
      }
    };

    loadStore();

    return () => {
      mounted = false;
    };
  }, [token, form.PrpCode, form.YearNo]);

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

  const NewCartonDropdownField = ({ label, value, required, onPress }) => (
    <View style={newCartonStyles.formRow}>
      <Text style={newCartonStyles.formLabel}>
        {label}{required && <Text style={newCartonStyles.required}> *</Text>}
      </Text>
      <TouchableOpacity style={newCartonStyles.dropdown} activeOpacity={0.8} onPress={onPress}>
        <Text style={value ? newCartonStyles.dropdownText : newCartonStyles.dropdownPlaceholder}>
          {value || 'Select...'}
        </Text>
        <Text style={newCartonStyles.dropdownArrow}>▾</Text>
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
    console.log('get_verify_manual_fabric_stock API payload : ', payload)
    console.log('get_verify_manual_fabric_stock API URL : ', `${API}/api/get_verify_manual_fabric_stock`)
    try {
      const response = await axios.post(`${API}/api/get_verify_manual_fabric_stock`, payload, { headers });
      console.log('get_verify_manual_fabric_stock API response : ', response)

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

          navigation.navigate('FabricStockVerification', {
            mode: 'browse',
            criteriaForm,
            stockData: alldt,
          });
        } else {
          navigation.navigate('FabricStockVerification', {
            mode: 'browse',
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
      console.log("insert_verify_manual_fabric_stock api payload :", payload)
      console.log("insert_verify_manual_fabric_stock api url :", `${API}/api/insert_verify_manual_fabric_stock`)
      try {
        const response = await axios.post(`${API}/api/insert_verify_manual_fabric_stock`, payload, { headers });
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
    <SafeAreaView style={newCartonStyles.safeArea} edges={['top']}>
      <StatusBar backgroundColor={NEW_CARTON_BLUE} barStyle="light-content" />

      {/* Header */}
      <View style={newCartonStyles.header}>
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
        <Text style={newCartonStyles.headerTitle}>New Carton</Text>
      </View>

      <ScrollView contentContainerStyle={newCartonStyles.body} showsVerticalScrollIndicator={false}>
        <View style={newCartonStyles.card}>
          <NewCartonSectionTitle title="Stock Information" />
          <NewCartonDropdownField
            label="Property"
            value={
              getAllPropertyData.find(
                x => x.PrpCode === form.PrpCode
              )?.PrpName || ''
            }
            onPress={() => setPropertyVisible(true)}
          />

          <NewCartonDropdownField
            label="Year"
            value={
              getAllYearData.find(
                x => x.YearNo === form.YearNo
              )?.YearName || ''
            }
            onPress={() => setYearVisible(true)}
          />

          <NewCartonDropdownField
            label="Store"
            value={
              getAllStoreData.find(
                x => x.StrCode === form.StrCode
              )?.StrName || ''
            }
            onPress={() => setStoreVisible(true)}
          />

          <NewCartonDropdownField
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
        <View style={newCartonStyles.card}>
          <NewCartonDropdownField
            label="Item"
            value={
              itemData.find(x => x.ItmCode === form.ItmCode)?.ItmName || ''
            }
            required
            onPress={() => setItemVisible(true)}
          />

          <NewCartonDropdownField
            label="Merge"
            value={
              mergeData.find(x => x.MerCode === form.MerCode)?.MerName || ''
            }
            required
            onPress={() => setMergeVisible(true)}
          />

          <NewCartonDropdownField
            label="Grade"
            value={
              gradeData.find(x => x.GrdCode === form.GrdCode)?.GrdName || ''
            }
            required
            onPress={() => setGradeVisible(true)}
          />

          <NewCartonDropdownField
            label="Shade"
            value={
              shadeData.find(x => x.ShdCode === form.ShdCode)?.ShdName || ''
            }
            required
            onPress={() => setShadeVisible(true)}
          />
          <NewCartonInputField
            label="Denier"
            value={form.Denier}
            onChangeText={set('Denier')}
            required
            keyboardType="numeric"
          />
        </View>

        {/* Quantity Details */}
        <View style={newCartonStyles.card}>
          <NewCartonSectionTitle title="Quantity Details" />

          <View style={newCartonStyles.formRow}>
            <Text style={newCartonStyles.formLabel}>Carton No *</Text>
            <View style={newCartonStyles.inputWithClear}>
              <TextInput
                style={[newCartonStyles.input, { flex: 1, borderWidth: 0 }]}
                value={form.CartNo}
                onChangeText={set('CartNo')}
              />
              <TouchableOpacity onPress={() => set('CartNo')('')} style={newCartonStyles.clearBtn}>
                <Text style={newCartonStyles.clearText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={newCartonStyles.doubleRow}>
            <View style={[newCartonStyles.formRow, { flex: 1, marginRight: 8 }]}>
              <Text style={newCartonStyles.formLabel}>Chees <Text style={newCartonStyles.required}>*</Text></Text>
              <TextInput
                style={newCartonStyles.input}
                value={form.Chees}
                onChangeText={set('Chees')}
                keyboardType="numeric"
              />
            </View>
            <View style={[newCartonStyles.formRow, { flex: 1 }]}>
              <Text style={newCartonStyles.formLabel}>Gross Wt (KG) <Text style={newCartonStyles.required}>*</Text></Text>
              <TextInput
                style={newCartonStyles.input}
                value={form.grsWt}
                onChangeText={set('grsWt')}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={newCartonStyles.formRow}>
            <Text style={newCartonStyles.formLabel}>Net Weight (KG) <Text style={newCartonStyles.required}>*</Text></Text>
            <TextInput
              style={newCartonStyles.input}
              value={form.netWt}
              onChangeText={set('netWt')}
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity style={newCartonStyles.saveBtn} activeOpacity={0.85} onPress={handleSaveCarton}>
          <Text style={newCartonStyles.saveBtnText}>SAVE CARTON</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal
        visible={propertyVisible}
        animationType="slide"
        onRequestClose={() => setPropertyVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>

          <View style={newCartonStyles.modalHeader}>
            <Text style={newCartonStyles.modalTitle}>Select Property</Text>

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
                  newCartonStyles.modalItemNew,
                  form.PrpCode === item.PrpCode && newCartonStyles.selectedItem,
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
                <Text style={newCartonStyles.itemText}>
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

          <View style={newCartonStyles.modalHeader}>
            <Text style={newCartonStyles.modalTitle}>Select Year</Text>

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
                  newCartonStyles.modalItemNew,
                  form.YearNo === item.YearNo && newCartonStyles.selectedItem,
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
                <Text style={newCartonStyles.itemText}>
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

          <View style={newCartonStyles.modalHeader}>
            <Text style={newCartonStyles.modalTitle}>Select Store</Text>

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
                  newCartonStyles.modalItemNew,
                  form.StrCode === item.StrCode && newCartonStyles.selectedItem,
                ]}
                onPress={() => {
                  setForm(prev => ({
                    ...prev,
                    StrCode: item.StrCode,
                  }));
                  setStoreVisible(false);
                }}
              >
                <Text style={newCartonStyles.itemText}>
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

          <View style={newCartonStyles.modalHeader}>
            <Text style={newCartonStyles.modalTitle}>Select Item</Text>

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
                  style={newCartonStyles.modalItemNew}
                  onPress={() => {
                    setForm(prev => ({
                      ...prev,
                      ItmCode: item.ItmCode,
                      Denier: item.Denier
                    }));
                    setItemVisible(false);
                  }}
                >
                  <Text style={newCartonStyles.itemText}>
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

          <View style={newCartonStyles.modalHeader}>
            <Text style={newCartonStyles.modalTitle}>Select Merge</Text>

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
                  style={newCartonStyles.modalItemNew}
                  onPress={() => {
                    setForm(prev => ({
                      ...prev,
                      MerCode: item.MerCode,
                    }));
                    setMergeVisible(false);
                  }}
                >
                  <Text style={newCartonStyles.itemText}>
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

          <View style={newCartonStyles.modalHeader}>
            <Text style={newCartonStyles.modalTitle}>Select Grade</Text>

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
                  style={newCartonStyles.modalItemNew}
                  onPress={() => {
                    setForm(prev => ({
                      ...prev,
                      GrdCode: item.GrdCode,
                    }));
                    setGradeVisible(false);
                  }}
                >
                  <Text style={newCartonStyles.itemText}>
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

          <View style={newCartonStyles.modalHeader}>
            <Text style={newCartonStyles.modalTitle}>Select Shade</Text>

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
                  style={newCartonStyles.modalItemNew}
                  onPress={() => {
                    setForm(prev => ({
                      ...prev,
                      ShdCode: item.ShdCode,
                    }));
                    setShadeVisible(false);
                  }}
                >
                  <Text style={newCartonStyles.itemText}>
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

const newCartonStyles = StyleSheet.create({
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
    borderLeftColor: NEW_CARTON_BLUE,
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
    color: NEW_CARTON_BLUE,
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
    backgroundColor: NEW_CARTON_BLUE,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: NEW_CARTON_BLUE,
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
// Unified browse view

const STOCK_LIST_BLUE = '#0f8f9a';

const STOCK_CARD_COLORS = {
  '0': '#98FAF3', // Manual
  '1': '#FFFFFF', // Auto not found
  '2': '#F1FA73', // Auto found
  '3': '#B59AE3', // Auto for repacking
  '5': '#DBA7D7', // Stock not found
};

// const stockData = [
//   {
//     id: 'C000123',
//     item: 'Polyester Yarn',
//     grade: 'A Grade',
//     shade: 'Black',
//     merge: 'M1',
//     denier: 80,
//     qty: '250.00',
//     user: 'ADMIN',
//     status: 1,
//   },
//   {
//     id: 'C000124',
//     item: 'Polyester Yarn',
//     grade: 'B Grade',
//     shade: 'White',
//     merge: 'M2',
//     denier: 100,
//     qty: '180.50',
//     user: 'RAMESH',
//     status: 2,
//   },
//   {
//     id: 'C000125',
//     item: 'Nylon Yarn',
//     grade: 'A Grade',
//     shade: 'Red',
//     merge: 'M3',
//     denier: 70,
//     qty: '320.00',
//     user: 'ADMIN',
//     status: 3,
//   },
//   {
//     id: 'C000126',
//     item: 'Cotton Yarn',
//     grade: 'C Grade',
//     shade: 'Blue',
//     merge: 'M1',
//     denier: 60,
//     qty: '95.75',
//     user: 'SURESH',
//     status: 5,
//   },
// ];

function StockListView({ navigation, route, token }) {
  const stockData = route?.params?.stockData || [];
  const criteriaForm = route?.params?.criteriaForm || {};
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedCartons, setSavedCartons] = useState([]);
  const [printer, setPrinter] = useState('')

  const getToken = () => {
    return token;
  };



  const [search, setSearch] = useState('');

  const filtered = stockData.filter(
    (s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.item.toLowerCase().includes(search.toLowerCase()) ||
      s.shade.toLowerCase().includes(search.toLowerCase()) ||
      s.user.toLowerCase().includes(search.toLowerCase())
  );


  const FabricStockCard = ({ item, onView, onPrint }) => {
    const cardBg =
      item.status === 0 ? '#98FAF3' :
        item.status === 2 ? '#F1FA73' :
          item.status === 3 ? '#B59AE3' :
            item.status === 5 ? '#DBA7D7' :
              '#FFFFFF';
    return (
      // <View style={stockListStyles.card}>
      <View style={stockListStyles.card}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 5,
            backgroundColor: cardBg,
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
          }}
        />
        {/* Header */}
        <View style={stockListStyles.cardTop}>
          <View>
            <Text style={stockListStyles.cartonNo}>{item.id}</Text>
            <Text style={stockListStyles.itemName}>{item.item}</Text>
          </View>

          <View style={stockListStyles.qtyBox}>
            <Text style={stockListStyles.qtyLabel}>Qty</Text>
            <Text style={stockListStyles.qtyValue}>{item.qty}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={stockListStyles.detailSection}>
          <View style={stockListStyles.left}>
            <Text style={stockListStyles.detailText}>Grade : {item.grade}</Text>
            <Text style={stockListStyles.detailText}>Shade : {item.shade}</Text>
            <Text style={stockListStyles.detailText}>Merge : {item.merge}</Text>
            <Text style={stockListStyles.detailText}>Denier : {item.denier}</Text>
          </View>

          <View style={stockListStyles.right}>
            <Text style={{ color: '#000' }}>User</Text>
            <Text style={stockListStyles.user}>{item.user}</Text>
          </View>
        </View>

        {/* Footer */}
        {/* <TouchableOpacity style={stockListStyles.actionBtn}>
          <Icon name="visibility" size={18} color="#0F8F9A" />
          <Text style={stockListStyles.actionText}>VIEW</Text>
        </TouchableOpacity> */}


        {/* <View style={stockListStyles.cardActions}> */}

        {(item.status === 1 && !savedCartons.includes(item.id)) && (
          <TouchableOpacity
            style={stockListStyles.actionBtn}
            onPress={() => onView && onView(item)}
          >
            {/* <Text style={stockListStyles.actionIcon}>👁</Text> */}
            <Text style={stockListStyles.actionText}>Update Stock</Text>
          </TouchableOpacity>
        )}

        {(item.status === 2 || savedCartons.includes(item.id)) && (
          <TouchableOpacity
            style={stockListStyles.actionBtn}
            onPress={() => onPrint(item)}
          >
            {/* <Text style={stockListStyles.actionIcon}>🖨</Text> */}
            <Text style={stockListStyles.actionText}>PRINT</Text>
          </TouchableOpacity>
        )}

        {/* </View> */}
      </View >
    );
  };

  const updateStockData = async (rowData) => {
    setIsLoading(true);

    const getSelectedStockRow = {
      ...rowData,
      Chk: '1',
    };

    const payload = {
      data: [getSelectedStockRow],
      prptype: 'S',
      prpcodes: [criteriaForm.PrpCode],
      yearno: criteriaForm.YearNo,
      strcode: criteriaForm.StrCode,
      updateStock: criteriaForm.updateStock,
      autoFound: criteriaForm.autoFound || '0',
      manual: criteriaForm.manual || '0',
      stockNotFound: criteriaForm.stockNotFound || '0',
      autoNotFound: criteriaForm.autoNotFound || '0',
      autoForRepacking: criteriaForm.autoForRepacking || '0',
      duplicate: criteriaForm.duplicate || '0',
      txntype: 'yarnStockVerification',
      isstockupdate: '1',
    };

    console.log("payload", payload);

    const headers = {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'X-Requested-with': 'XMLHttpRequest',
    };

    try {
      const response = await axios.post(
        `${API}/api/update_verify_manual_stock`,
        payload,
        { headers }
      );
      console.log("response", response);
      if (
        response.data.success === true &&
        response.data.data.length > 0
      ) {
        setSavedCartons(prev => [
          ...prev,
          response.data.data[0].UId,
        ]);

        Snackbar.show({
          text: 'Data Updated Successfully.',
          duration: Snackbar.LENGTH_LONG,
          backgroundColor: 'green',
          textColor: '#fff',
        });

        setShowConfirm(false);
      } else {
        Alert.alert(response.data.message || 'No Data Found');
      }
    } catch (error) {
      Alert.alert('Server Error : ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const printSticker = (data) => {

    setIsLoading(true);
    console.log('printsticker function :', data);

    if (Object.keys(data).length > 0) {

      data.yearno = typeof criteriaForm.YearNo != 'undefined' && criteriaForm.YearNo != null && criteriaForm.YearNo != '' ? criteriaForm.YearNo : '99'
      const params = {
        data: [data],
        IskgQty: 0,
        printype: "Print",
        PrintFormat: 3,
        printerName: printer ? printer : '',
        txntype: 'yarnStockVerification'
      };
      const headers = {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'X-Requested-with': 'XMLHttpRequest',
      };
      console.log("params :", params)
      console.log("url :", `${PRINTSTICKER}`)

      axios.post(`${PRINTSTICKER}`, params, { headers })
        .then(response => {
          console.log("response :", response)
          setIsLoading(false);
          const res = response.data;

          if (res.success) {
            Snackbar.show({
              text: '✅ ${res.printed} label(s) sent to printer.',
              duration: Snackbar.LENGTH_INDEFINITE,
              backgroundColor: 'green',
              action: { text: 'OK', textColor: 'white' },
            });
          } else {
            Snackbar.show({
              text: res.message || 'Operation failed',
              duration: Snackbar.LENGTH_INDEFINITE,
              backgroundColor: 'red',
              action: { text: 'OK', textColor: 'white' },
            });
          }
        }).catch(error => {
          setIsLoading(false);
          Snackbar.show({
            text: error?.response?.data?.error || error.message || 'Print failed',
            duration: Snackbar.LENGTH_LONG,
            backgroundColor: 'red',
            action: { text: 'OK', textColor: 'white' },
          });
        });
    } else {
      setIsLoading(false);
      Snackbar.show({
        text: 'printing sticker data is empty',
        duration: Snackbar.LENGTH_LONG,
        backgroundColor: 'red',
        textColor: '#fff',
        action: { text: 'OK', textColor: '#fff' },
      });
    }
  }

  return (
    <SafeAreaView style={stockListStyles.safeArea} edges={['top']}>
      <StatusBar backgroundColor={STOCK_LIST_BLUE} barStyle="light-content" />

      {/* Header */}
      <View style={stockListStyles.header}>
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
        <Text style={stockListStyles.headerTitle}>Fabric Stock List</Text>
      </View>

      {/* Search Bar */}
      <View style={stockListStyles.searchContainer}>
        <TextInput
          style={stockListStyles.searchInput}
          placeholder="Search by Carton No / Item / Shade / User"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={stockListStyles.clearBtn}>
            <Text style={stockListStyles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={stockListStyles.legendContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={stockListStyles.legendRow}>

            <View style={stockListStyles.legendItem}>
              <View style={[stockListStyles.legendBox, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#000' }]} />
              <Text style={stockListStyles.legendText}>Auto not found</Text>
            </View>

            <View style={stockListStyles.legendItem}>
              <View style={[stockListStyles.legendBox, { backgroundColor: '#F1FA73' }]} />
              <Text style={stockListStyles.legendText}>Auto found</Text>
            </View>

            <View style={stockListStyles.legendItem}>
              <View style={[stockListStyles.legendBox, { backgroundColor: '#B59AE3' }]} />
              <Text style={stockListStyles.legendText}>Auto for repacking</Text>
            </View>

            <View style={stockListStyles.legendItem}>
              <View style={[stockListStyles.legendBox, { backgroundColor: '#98FAF3' }]} />
              <Text style={stockListStyles.legendText}>Manual</Text>
            </View>

            <View style={stockListStyles.legendItem}>
              <View style={[stockListStyles.legendBox, { backgroundColor: '#678F76' }]} />
              <Text style={stockListStyles.legendText}>Duplicate</Text>
            </View>

            <View style={stockListStyles.legendItem}>
              <View style={[stockListStyles.legendBox, { backgroundColor: '#DBA7D7' }]} />
              <Text style={stockListStyles.legendText}>Stock not found</Text>
            </View>

          </View>
        </ScrollView>
      </View>

      {/* Summary Tiles */}
      <View style={stockListStyles.summaryRow}>
        <View style={stockListStyles.summaryTile}>
          <Text style={stockListStyles.summaryLabel}>Total Cartons</Text>
          <Text style={stockListStyles.summaryValue}>1,248</Text>
        </View>
        <View style={[stockListStyles.summaryTile, stockListStyles.summaryMiddle]}>
          <Text style={stockListStyles.summaryLabel}>Total Qty(KG)</Text>
          <Text style={stockListStyles.summaryValue}>15,430.50</Text>
        </View>
        <View style={stockListStyles.summaryTile}>
          <Text style={stockListStyles.summaryLabel}>Saved</Text>
          <Text style={[stockListStyles.summaryValue, { color: '#27AE60' }]}>86</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={stockListStyles.listBody} showsVerticalScrollIndicator={false}>
        {filtered.map((item) => (
          <FabricStockCard
            key={item.id}
            item={item}
            onView={(item) => {
              setSelectedItem(item);
              setShowConfirm(true);
            }}
            onPrint={(item) => printSticker(item)}
          />
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={stockListStyles.fab}
        onPress={() =>
          navigation && navigation.navigate('FabricStockVerification', {
            mode: 'new',
            criteriaForm,
            stockData: route.params.stockData
          })
        }
        activeOpacity={0.85}
      >
        <Text style={stockListStyles.fabIcon}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              width: Dimensions.get('window').width * 0.90,
              backgroundColor: '#FFFFFF',
              borderRadius: 28,
              overflow: 'hidden',

              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 15,
            }}
          >
            {/* Header */}
            <View
              style={{
                alignItems: 'center',
                paddingTop: 25,
                paddingBottom: 15,
              }}
            >
              <View
                style={{
                  width: 85,
                  height: 85,
                  borderRadius: 42.5,
                  backgroundColor: '#EEF6FF',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Icon
                  name="inventory"
                  size={42}
                  color="#14B8A6"
                />
              </View>

              <Text
                style={{
                  marginTop: 12,
                  fontSize: 28,
                  fontWeight: '700',
                  color: '#000',
                }}
              >
                Update Confirm
              </Text>

              <Text
                style={{
                  marginTop: 5,
                  color: '#6B7280',
                  fontSize: 15,
                }}
              >
                Please verify the details before updating
              </Text>
            </View>

            {/* Details Card */}
            {selectedItem && (
              <View
                style={{
                  marginHorizontal: 18,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: '#ECECEC',
                }}
              >
                {[
                  ['Carton No', selectedItem.id],
                  ['Item', selectedItem.item],
                  ['Merge', selectedItem.merge],
                  ['Grade', selectedItem.grade],
                  ['Shade', selectedItem.shade],
                  ['Weight', `${selectedItem.qty} KG`],
                ].map(([label, value], index, arr) => (
                  <View
                    key={label}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth:
                        index === arr.length - 1 ? 0 : 1,
                      borderBottomColor: '#E5E7EB',
                    }}
                  >
                    <Text
                      style={{
                        color: '#6B7280',
                        fontSize: 15,
                      }}
                    >
                      {label}
                    </Text>

                    <Text
                      style={{
                        color: '#111827',
                        fontSize: 15,
                        fontWeight: '600',
                        maxWidth: '60%',
                        textAlign: 'right',
                      }}
                    >
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#EEF6FF',
                marginHorizontal: 18,
                marginTop: 18,
                borderRadius: 16,
                padding: 15,
              }}
            >
              <View
                style={{
                  width: 55,
                  height: 55,
                  borderRadius: 27.5,
                  borderWidth: 2,
                  borderColor: '#14B8A6',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <Icon
                  name="verified-user"
                  size={28}
                  color="#14B8A6"
                />
              </View>

              <Text
                style={{
                  flex: 1,
                  color: '#111827',
                  fontSize: 17,
                  fontWeight: '600',
                  lineHeight: 24,
                }}
              >
                Are you sure you want to update this carton?
              </Text>
            </View>

            {/* Buttons */}
            <View
              style={{
                flexDirection: 'row',
                paddingHorizontal: 18,
                paddingTop: 22,
                paddingBottom: 22,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  height: 55,
                  borderWidth: 1.5,
                  borderColor: '#FF5A5F',
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Icon
                    name="close"
                    size={22}
                    color="#FF5A5F"
                  />

                  <Text
                    style={{
                      marginLeft: 6,
                      color: '#FF5A5F',
                      fontSize: 18,
                      fontWeight: '700',
                    }}
                  >
                    No
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  updateStockData(selectedItem);
                }}
                style={{
                  flex: 1,
                  height: 55,
                  backgroundColor: '#14B88A',
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Icon
                    name="check"
                    size={22}
                    color="#FFF"
                  />

                  <Text
                    style={{
                      marginLeft: 6,
                      color: '#FFF',
                      fontSize: 18,
                      fontWeight: '700',
                    }}
                  >
                    Yes
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const stockListStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F4F8' },
  header: {
    backgroundColor: STOCK_LIST_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  backBtn: { marginRight: 10 },
  backIcon: { color: '#fff', fontSize: 22, fontWeight: '300' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerRight: { flexDirection: 'row' },
  iconBtn: { marginLeft: 10 },
  headerIcon: { fontSize: 18 },

  // Criteria banner
  criteriaBar: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D8DEFF',
  },
  criteriaText: { fontSize: 11, color: '#444', marginBottom: 6, fontWeight: '500' },
  optionsBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  optBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  optBadgeOn: { backgroundColor: '#E6F9ED' },
  optBadgeOff: { backgroundColor: '#FFE8E8' },
  optBadgeText: { fontSize: 10, fontWeight: '700' },
  optTextOn: { color: '#27AE60' },
  optTextOff: { color: '#E53935' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#333', paddingVertical: Platform.OS === 'ios' ? 11 : 8 },
  clearBtn: { padding: 4 },
  clearText: { color: '#999', fontSize: 14 },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  summaryTile: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  summaryMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#EEF0F5' },
  summaryLabel: { fontSize: 11, color: '#888', marginBottom: 3 },
  summaryValue: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  listBody: { paddingHorizontal: 12, paddingBottom: 80 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  qtyBox: {
    backgroundColor: '#F4F7FA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },

  detailSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  actionBtn: {
    borderTopWidth: 1,
    borderColor: '#EEE',
    marginTop: 14,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionText: {
    marginLeft: 6,
    fontWeight: '700',
    color: '#0F8F9A',
  },

  cartonNo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },

  itemName: {
    fontSize: 14,
    color: '#000',
    marginTop: 2,
  },

  qtyLabel: {
    fontSize: 11,
    color: '#000',
  },

  qtyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },

  left: {
    flex: 1,
  },

  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  userLabel: {
    fontSize: 12,
    color: '#000',
  },

  user: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginTop: 4,
  },

  detailText: {
    color: '#000',
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },

  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardDetails: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10 },
  detailsLeft: { flex: 1 },
  // detailText: { fontSize: 12, color: '#555', marginBottom: 3 },
  detailsRight: { alignItems: 'flex-end' },
  // qtyLabel: { fontSize: 11, color: '#888' },
  // qtyValue: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  // userLabel: { fontSize: 11, color: '#888' },
  userValue: { fontSize: 12, fontWeight: '600', color: '#333' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  // actionBtn: {
  //   flex: 1,
  //   flexDirection: 'row',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   paddingVertical: 10,
  // },
  actionIcon: { fontSize: 13 },
  // actionText: { fontSize: 12, color: '#555', fontWeight: '600' },
  divider: { width: 1, backgroundColor: '#F0F0F0' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: STOCK_LIST_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: STOCK_LIST_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 30, marginTop: -2 },
  legendContainer: {
    backgroundColor: '#f1e8e8',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
  },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },

  legendBox: {
    width: 18,
    height: 18,
    marginRight: 5,
  },

  legendText: {
    fontSize: 13,
    color: '#000',
  },
});
// Unified detail view

const STOCK_DETAIL_BLUE = '#2148C8';

const StockDetailRow = ({ label, value }) => (
  <View style={stockDetailStyles.detailRow}>
    <Text style={stockDetailStyles.detailLabel}>{label}</Text>
    <Text style={stockDetailStyles.detailColon}>:</Text>
    <Text style={stockDetailStyles.detailValue}>{value}</Text>
  </View>
);

function StockDetailView({ navigation, route }) {

  // ✅ RECEIVE both item and criteriaForm
  const item = route?.params?.item || {
    id: 'C000123',
    item: 'Polyester Yarn',
    merge: 'M1',
    grade: 'A Grade',
    shade: 'Black',
    denier: 80,
    chees: 48,
    qty: '250.00',
    grossWt: '256.20',
    netWt: '250.00',
    user: 'ADMIN',
    date: '20/05/2025 10:30 AM',
    status: 'Status 1',
  };

  const criteriaForm = route?.params?.criteriaForm || {};

  // Destructure criteriaForm fields for use in this screen
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

  const handleDelete = () => {
    Alert.alert(
      'Delete Carton',
      `Are you sure you want to delete carton ${item.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => navigation && navigation.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={stockDetailStyles.safeArea} edges={['top']}>
      <StatusBar backgroundColor={STOCK_DETAIL_BLUE} barStyle="light-content" />

      {/* Header */}
      <View style={stockDetailStyles.header}>
        <TouchableOpacity onPress={() => navigation && navigation.goBack()} style={stockDetailStyles.backBtn}>
          <Text style={stockDetailStyles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={stockDetailStyles.headerTitle}>Stock Detail</Text>
      </View>

      <ScrollView contentContainerStyle={stockDetailStyles.body} showsVerticalScrollIndicator={false}>

        {/* ✅ Criteria Context Card — shows where this stock belongs */}
        <View style={stockDetailStyles.contextCard}>
          <View style={stockDetailStyles.contextRow}>
            <View style={stockDetailStyles.contextItem}>
              <Text style={stockDetailStyles.contextLabel}>Property</Text>
              <Text style={stockDetailStyles.contextValue}>{property || '—'}</Text>
            </View>
            <View style={stockDetailStyles.contextItem}>
              <Text style={stockDetailStyles.contextLabel}>Store</Text>
              <Text style={stockDetailStyles.contextValue}>{store || '—'}</Text>
            </View>
            <View style={stockDetailStyles.contextItem}>
              <Text style={stockDetailStyles.contextLabel}>Year</Text>
              <Text style={stockDetailStyles.contextValue}>{year || '—'}</Text>
            </View>
          </View>
          {/* Show which options are active (1) */}
          <View style={stockDetailStyles.optRow}>
            <Text style={stockDetailStyles.optLabel}>Active Options: </Text>
            <Text style={stockDetailStyles.optValue}>
              {[
                updateStock === 1 && 'UpdateStock',
                autoFound === 1 && 'AutoFound',
                manual === 1 && 'Manual',
                stockNotFound === 1 && 'StockNotFound',
                autoNotFound === 1 && 'AutoNotFound',
                autoForRepacking === 1 && 'Repacking',
                duplicate === 1 && 'Duplicate',
              ]
                .filter(Boolean)
                .join(', ') || 'None'}
            </Text>
          </View>
        </View>

        {/* Carton Header */}
        <View style={stockDetailStyles.cartonHeader}>
          <View style={stockDetailStyles.boxIcon}>
            <Text style={stockDetailStyles.boxEmoji}>📦</Text>
          </View>
          <View style={stockDetailStyles.cartonInfo}>
            <Text style={stockDetailStyles.cartonLabel}>Carton No</Text>
            <Text style={stockDetailStyles.cartonNo}>{item.id}</Text>
          </View>
          <View style={stockDetailStyles.statusBadge}>
            <Text style={stockDetailStyles.statusText}>{item.status}</Text>
          </View>
        </View>

        {/* Detail Fields */}
        <View style={stockDetailStyles.card}>
          <StockDetailRow label="Item" value={item.item} />
          <StockDetailRow label="Merge" value={item.merge} />
          <StockDetailRow label="Grade" value={item.grade} />
          <StockDetailRow label="Shade" value={item.shade} />
          <StockDetailRow label="Denier" value={item.denier} />
          <StockDetailRow label="Chees" value={item.chees} />
          <StockDetailRow label="Qty (KG)" value={item.qty} />
          <StockDetailRow label="Gross Wt." value={item.grossWt} />
          <StockDetailRow label="Net Wt." value={item.netWt} />
          <StockDetailRow label="User" value={item.user} />
          <StockDetailRow label="Date" value={item.date} />
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={stockDetailStyles.printBtn} activeOpacity={0.85}>
          <Text style={stockDetailStyles.printBtnText}>PRINT STICKER</Text>
        </TouchableOpacity>

        {/* UPDATE STOCK only enabled if updateStock === 1 */}
        <TouchableOpacity
          style={[stockDetailStyles.updateBtn, updateStock !== 1 && stockDetailStyles.disabledBtn]}
          activeOpacity={updateStock === 1 ? 0.85 : 1}
          disabled={updateStock !== 1}
        >
          <Text style={stockDetailStyles.updateBtnText}>
            UPDATE STOCK {updateStock !== 1 ? '(Disabled)' : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={stockDetailStyles.deleteBtn} activeOpacity={0.85} onPress={handleDelete}>
          <Text style={stockDetailStyles.deleteBtnText}>DELETE CARTON</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const stockDetailStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F4F8' },
  header: {
    backgroundColor: STOCK_DETAIL_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  backBtn: { marginRight: 12 },
  backIcon: { color: '#fff', fontSize: 22, fontWeight: '300' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  body: { padding: 14, paddingBottom: 32 },

  // Context card
  contextCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: STOCK_DETAIL_BLUE,
  },
  contextRow: { flexDirection: 'row', marginBottom: 8 },
  contextItem: { flex: 1 },
  contextLabel: { fontSize: 10, color: '#888', marginBottom: 2 },
  contextValue: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  optRow: { flexDirection: 'row', flexWrap: 'wrap' },
  optLabel: { fontSize: 10, color: '#666', fontWeight: '600' },
  optValue: { fontSize: 10, color: STOCK_DETAIL_BLUE, fontWeight: '600', flex: 1, flexWrap: 'wrap' },

  cartonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  boxIcon: {
    width: 48, height: 48,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  boxEmoji: { fontSize: 24 },
  cartonInfo: { flex: 1 },
  cartonLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  cartonNo: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  statusBadge: {
    backgroundColor: '#E8F0FF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { color: STOCK_DETAIL_BLUE, fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F5',
  },
  detailLabel: { width: 90, fontSize: 13, color: '#666', fontWeight: '500' },
  detailColon: { marginHorizontal: 6, color: '#999', fontSize: 13 },
  detailValue: { flex: 1, fontSize: 13, color: '#1A1A2E', fontWeight: '600' },
  printBtn: {
    backgroundColor: STOCK_DETAIL_BLUE,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: STOCK_DETAIL_BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  printBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.8 },
  updateBtn: {
    backgroundColor: '#27AE60',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  disabledBtn: { backgroundColor: '#A5D6A7', elevation: 0 },
  updateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.8 },
  deleteBtn: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E53935',
    backgroundColor: '#fff',
  },
  deleteBtnText: { color: '#E53935', fontWeight: '700', fontSize: 14, letterSpacing: 0.8 },
});

// ============================================================================
// UNIFIED FABRIC STOCK VERIFICATION SCREEN
// One route/file contains Criteria + Browse + New Carton + Detail views.
// Navigation uses route param: { mode: 'criteria' | 'browse' | 'new' | 'detail' }
// Payloads are intentionally unchanged from the supplied screens.
// API rename requested:
//   get_verify_manual_stock   -> get_verify_manual_fabric_stock
//   insert_verify_manual_stock -> insert_verify_manual_fabric_stock
// update_verify_manual_stock is intentionally kept unchanged because the
// request specifically named GET and INSERT endpoint names.
// ============================================================================

const UNIFIED_ROUTE_NAME = 'FabricStockVerification';

function UnifiedFabricStockVerification({ navigation, route, token }) {
  const mode = route?.params?.mode || 'criteria';
  const commonParams = {
    navigation,
    route,
    token,
  };

  if (mode === 'browse') return <StockListView {...commonParams} />;
  if (mode === 'new') return <NewCartonView {...commonParams} />;
  if (mode === 'detail') return <StockDetailView {...commonParams} />;
  return <CriteriaView {...commonParams} />;
}

export default UnifiedFabricStockVerification;
