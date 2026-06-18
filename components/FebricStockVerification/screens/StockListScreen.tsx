// screens/StockListScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from "react-native-vector-icons/MaterialIcons";
import axios from 'axios';
import { API, PRINTSTICKER } from '../../../common/API/dynamicAPI';
import Snackbar from 'react-native-snackbar';
import CriteriaForm from '../../YarnPurchaseOrder/CriteriaForm';

const BLUE = '#0f8f9a';

const CARD_COLORS = {
  '0': '#98FAF3', // Manual
  '1': '#FFFFFF', // Auto not found
  '2': '#F1FA73', // Auto found
  '3': '#B59AE3', // Auto for repacking
  '5': '#DBA7D7', // Stock not found
};

const stockData = [
  {
    id: 'C000123',
    item: 'Polyester Yarn',
    grade: 'A Grade',
    shade: 'Black',
    merge: 'M1',
    denier: 80,
    qty: '250.00',
    user: 'ADMIN',
    status: 1,
  },
  {
    id: 'C000124',
    item: 'Polyester Yarn',
    grade: 'B Grade',
    shade: 'White',
    merge: 'M2',
    denier: 100,
    qty: '180.50',
    user: 'RAMESH',
    status: 2,
  },
  {
    id: 'C000125',
    item: 'Nylon Yarn',
    grade: 'A Grade',
    shade: 'Red',
    merge: 'M3',
    denier: 70,
    qty: '320.00',
    user: 'ADMIN',
    status: 3,
  },
  {
    id: 'C000126',
    item: 'Cotton Yarn',
    grade: 'C Grade',
    shade: 'Blue',
    merge: 'M1',
    denier: 60,
    qty: '95.75',
    user: 'SURESH',
    status: 5,
  },
];







export default function StockListScreen({ navigation, route, token }) {

  // ✅ RECEIVE criteriaForm passed from CriteriaScreen

  // const stockData = route?.params?.stockData || [];
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


  const StockCard = ({ item, onView, onPrint }) => {
    const cardBg =
      item.status === 0 ? '#98FAF3' :
        item.status === 2 ? '#F1FA73' :
          item.status === 3 ? '#B59AE3' :
            item.status === 5 ? '#DBA7D7' :
              '#FFFFFF';
    return (
      // <View style={styles.card}>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cartonNo}>{item.id}</Text>
            <Text style={styles.itemName}>{item.item}</Text>
          </View>
          {/* <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
        </View> */}
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailsLeft}>
            <Text style={styles.detailText}>Grade  :  {item.grade}</Text>
            <Text style={styles.detailText}>Shade  :  {item.shade}</Text>
            <Text style={styles.detailText}>Merge  :  {item.merge}</Text>
            <Text style={styles.detailText}>Denier  :  {item.denier}</Text>
          </View>
          <View style={styles.detailsRight}>
            <Text style={styles.qtyLabel}>Qty (KG)</Text>
            <Text style={styles.qtyValue}>{item.qty}</Text>
            <Text style={styles.userLabel}>User</Text>
            <Text style={styles.userValue}>{item.user}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>

          {(item.status === 1 && !savedCartons.includes(item.id)) && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onView && onView(item)}
            >
              <Text style={styles.actionIcon}>👁</Text>
              <Text style={styles.actionText}>VIEW</Text>
            </TouchableOpacity>
          )}

          {(item.status === 2 || savedCartons.includes(item.id)) && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onPrint(item)}
            >
              <Text style={styles.actionIcon}>🖨</Text>
              <Text style={styles.actionText}>PRINT</Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
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
        <Text style={styles.headerTitle}>Fabric Stock List</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Carton No / Item / Shade / User"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.legendContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.legendRow}>

            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#000' }]} />
              <Text style={styles.legendText}>Auto not found</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#F1FA73' }]} />
              <Text style={styles.legendText}>Auto found</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#B59AE3' }]} />
              <Text style={styles.legendText}>Auto for repacking</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#98FAF3' }]} />
              <Text style={styles.legendText}>Manual</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#678F76' }]} />
              <Text style={styles.legendText}>Duplicate</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#DBA7D7' }]} />
              <Text style={styles.legendText}>Stock not found</Text>
            </View>

          </View>
        </ScrollView>
      </View>

      {/* Summary Tiles */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryLabel}>Total Cartons</Text>
          <Text style={styles.summaryValue}>1,248</Text>
        </View>
        <View style={[styles.summaryTile, styles.summaryMiddle]}>
          <Text style={styles.summaryLabel}>Total Qty(KG)</Text>
          <Text style={styles.summaryValue}>15,430.50</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryLabel}>Saved</Text>
          <Text style={[styles.summaryValue, { color: '#27AE60' }]}>86</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listBody} showsVerticalScrollIndicator={false}>
        {filtered.map((item) => (
          <StockCard
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
        style={styles.fab}
        onPress={() =>
          navigation && navigation.navigate('NewCarton', {
            criteriaForm,
            stockData: route.params.stockData
          })
        }
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
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

            {/* Message Box */}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F4F8' },
  header: {
    backgroundColor: BLUE,
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
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    paddingBottom: 8,
  },
  cartonNo: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  itemName: { fontSize: 13, color: '#555', marginTop: 2 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardDetails: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10 },
  detailsLeft: { flex: 1 },
  detailText: { fontSize: 12, color: '#555', marginBottom: 3 },
  detailsRight: { alignItems: 'flex-end' },
  qtyLabel: { fontSize: 11, color: '#888' },
  qtyValue: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  userLabel: { fontSize: 11, color: '#888' },
  userValue: { fontSize: 12, fontWeight: '600', color: '#333' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionIcon: { fontSize: 13 },
  actionText: { fontSize: 12, color: '#555', fontWeight: '600' },
  divider: { width: 1, backgroundColor: '#F0F0F0' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: BLUE,
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
