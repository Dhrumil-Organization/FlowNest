// // EnquiryReportDrilldownScreen.js
// // Shows one salesperson's enquiry list for the selected event.
// // Tapping a row opens a detail modal with the full enquiry info.
// //
// // Navigation params expected: { userId, userName, userRole, eventCode }

// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   Modal,
//   ScrollView,
// } from 'react-native';
// import api from './api';
// import { API } from '../../common/API/dynamicAPI';
// // import { Icon } from 'react-native-vector-icons/Icon';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// export default function EnquiryReportDrilldownScreen({ route, navigation }) {
//   const { userId, userName, userRole, eventCode } = route.params;
//   const [loading, setLoading] = useState(true);
//   const [enquiries, setEnquiries] = useState([]);
//   const [selected, setSelected] = useState(null);

//   useEffect(() => {
//     navigation.setOptions({ title: userName });
//     loadEnquiries();
//   }, [navigation]);

//   async function loadEnquiries() {
//     try {
//       const res = await api.get(
//         `${API}/api/reports/enquiries/user/${userId}?prptype=S&yearno=27`,
//         {
//           // params: { event: eventCode },
//           params: { event: eventCode },
//         },
//       );
//       console.log('user enquiries', userId, res);
//       setEnquiries(res.data.enquiries);
//     } catch (err) {
//       console.log('Failed to load user enquiries', err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   function renderRow({ item }) {
//     return (
//       <TouchableOpacity style={styles.row} onPress={() => setSelected(item)}>
//         <View style={styles.rowLeft}>
//           <Text style={styles.party}>{item.party_name}</Text>
//           <Text style={styles.sub}>
//             {item.contact_name || 'No contact name'} ·{' '}
//             {formatDate(item.created_at)}
//           </Text>
//         </View>
//         <View style={styles.rowRight}>
//           <Text style={styles.qty}>
//             <Text style={styles.qtyNum}>
//               {Number(item.qty_required || 0).toLocaleString()}
//             </Text>{' '}
//             m
//           </Text>
//           <TouchableOpacity
//             style={styles.btn}
//             onPress={
//               () =>
//                 navigation.navigate('Event', {
//                   id: item.id,
//                 })
//               //  setSelected(item)
//             }
//           >
//             <Icon name='edit' color={'blue'} size={20}/>
//             {/* <Text style={styles.btnText}>Edit</Text> */}
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.btn}
//             onPress={
//               () =>
//                 navigation.navigate('EnquiryReportDrilldown', {
//                   id: item.id,
//                 })
//               //  setSelected(item)
//             }
//           >
//               <Icon name='delete' color={'red'} size={20}/>
//           </TouchableOpacity>
//         </View>
//       </TouchableOpacity>
//     );
//   }

//   function formatDate(dateStr) {
//     if (!dateStr) return '';
//     const d = new Date(dateStr);
//     return (
//       d.toLocaleDateString() +
//       ' ' +
//       d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
//     );
//   }

//   if (loading) {
//     return (
//       <View style={styles.centerScreen}>
//         <ActivityIndicator color="#c2622f" />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.screen}>
//       <View style={styles.header}>
//         <Text style={styles.headerName}>{userName}</Text>
//         <Text style={styles.headerSub}>
//           {userRole} · {enquiries.length} enquiries
//         </Text>
//       </View>

//       <FlatList
//         data={enquiries}
//         keyExtractor={item => String(item.id)}
//         renderItem={renderRow}
//         contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
//         ListEmptyComponent={
//           <Text style={styles.empty}>No enquiries from this user yet.</Text>
//         }
//       />

//       <Modal
//         visible={!!selected}
//         animationType="slide"
//         transparent
//         onRequestClose={() => setSelected(null)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalCard}>
//             <TouchableOpacity
//               style={styles.modalClose}
//               onPress={() => setSelected(null)}
//             >
//               <Text style={{ fontSize: 18, color: '#6b7280' }}>✕</Text>
//             </TouchableOpacity>
//             {selected && (
//               <ScrollView>
//                 <Text style={styles.modalTitle}>{selected.party_name}</Text>
//                 <Text style={styles.modalSub}>
//                   Enquiry #{selected.id} · {formatDate(selected.created_at)}
//                 </Text>

//                 <DetailRow label="Contact name" value={selected.contact_name} />
//                 <DetailRow label="Mobile" value={selected.mobile} />
//                 <DetailRow label="Email" value={selected.email} />
//                 <DetailRow label="Address" value={selected.address} />
//                 <DetailRow label="GST No." value={selected.gst_no} />
//                 <DetailRow
//                   label="Design requirement"
//                   value={selected.design_requirement}
//                 />
//                 <DetailRow
//                   label="Colour requirement"
//                   value={selected.colour_requirement}
//                 />
//                 <DetailRow
//                   label="Qty required"
//                   value={
//                     selected.qty_required
//                       ? `${Number(selected.qty_required).toLocaleString()} m`
//                       : null
//                   }
//                 />
//                 <DetailRow
//                   label="Price"
//                   value={selected.price ? `₹${selected.price}/m` : null}
//                 />
//               </ScrollView>
//             )}
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// function DetailRow({ label, value }) {
//   return (
//     <View style={styles.detailRow}>
//       <Text style={styles.detailKey}>{label}</Text>
//       <Text style={styles.detailVal}>{value || '—'}</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   screen: { flex: 1, backgroundColor: '#f7f6f2' },
//   header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
//   headerName: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
//   headerSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#e3e1da',
//     borderRadius: 9,
//     backgroundColor: '#fff',
//     padding: 14,
//     marginBottom: 10,
//   },
//   rowLeft: { flex: 1 },
//   party: { fontSize: 13.5, fontWeight: '700', color: '#1f2937' },
//   sub: { fontSize: 11.5, color: '#6b7280', marginTop: 2 },
//   rowRight: { alignItems: 'flex-end', display: 'flex', flexDirection: 'row', gap: 5 },
//   qty: { fontSize: 13, color: '#374151' },
//   qtyNum: { fontWeight: '700' },
//   empty: { textAlign: 'center', color: '#6b7280', fontSize: 13, marginTop: 40 },
//   centerScreen: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#f7f6f2',
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.35)',
//     justifyContent: 'center',
//     padding: 24,
//   },
//   modalCard: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 20,
//     maxHeight: '80%',
//   },
//   modalClose: { position: 'absolute', top: 14, right: 16, zIndex: 1 },
//   modalTitle: {
//     fontSize: 17,
//     fontWeight: '700',
//     color: '#1f2937',
//     marginBottom: 2,
//     paddingRight: 24,
//   },
//   modalSub: { fontSize: 11.5, color: '#6b7280', marginBottom: 14 },
//   detailRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 9,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e3e1da',
//   },
//   detailKey: { fontSize: 13, color: '#6b7280' },
//   detailVal: {
//     fontSize: 13,
//     color: '#1f2937',
//     fontWeight: '600',
//     textAlign: 'right',
//     maxWidth: '60%',
//   },
// });

// EnquiryReportDrilldownScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from './api';
import { API } from '../../common/API/dynamicAPI';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import { deleteEnquiries } from './syncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EnquiryReportDrilldownScreen({ route, navigation }) {
  const { userId, userName, userRole, eventCode } = route.params;
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load enquiries
  const loadEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `${API}/api/reports/enquiries/user/${userId}?prptype=S&yearno=27`,
        {
          params: { event: eventCode },
        },
      );
      console.log('User enquiries:', userId, res.data.enquiries);
      setEnquiries(res.data.enquiries || []);
    } catch (err) {
      console.log('Failed to load user enquiries:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, eventCode]);

  // Reload enquiries when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadEnquiries();
    }, [loadEnquiries]),
  );

  // Set header title
  useEffect(() => {
    navigation.setOptions({ title: userName });
  }, [navigation, userName]);

  // Handle Edit button press
  const handleEdit = item => {
    setSelected(null); // Close modal if open
    navigation.navigate('Event', { id: item.id });
  };

  // Handle Delete button press
  const handleDelete = async item => {
    setSelected(null); // Close modal if open
    // navigation.navigate('EnquiryReportDrilldown', { id: item.id });
    try {
      const token = await AsyncStorage.getItem('access_token');
      const user_prptype = await AsyncStorage.getItem('user_prptype');
      const result = await deleteEnquiries(
        item.id,
        token,
        getCurrentFinancialYear(),
        user_prptype,
      );

      console.log(
        'API RESULT =>',
        getCurrentFinancialYear(),
        user_prptype,
        result,
      );

      if (result.success === true) {
        Alert.alert(`${result.message} for ${item.party_name}!`);
        loadEnquiries();
      }
    } catch (err) {
      console.log('LOAD ERROR =>', err);
    }
  };

  // Render each row in the FlatList
  const renderRow = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => setSelected(item)}>
      <View style={styles.rowLeft}>
        <Text style={styles.party}>{item.party_name}</Text>
        <Text style={styles.sub}>
          {item.contact_name || 'No contact name'} ·{' '}
          {formatDate(item.created_at)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.qty}>
          <Text style={styles.qtyNum}>
            {Number(item.qty_required || 0).toLocaleString()}
          </Text>{' '}
          m
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => handleEdit(item)}
          >
            <Icon name="edit" color="#2196F3" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
          >
            <Icon name="delete" color="#F44336" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Format date
  const formatDate = dateStr => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString() +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  // Pull-to-refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    loadEnquiries();
  };

  // Render header with refresh button
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerName}>{userName}</Text>
      <View style={styles.headerRow}>
        <Text style={styles.headerSub}>
          {userRole} · {enquiries.length} enquiries
        </Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Icon name="refresh" color="#6b7280" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Loading indicator
  if (loading && !refreshing) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color="#c2622f" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={enquiries}
        keyExtractor={item => String(item.id)}
        renderItem={renderRow}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <Text style={styles.empty}>No enquiries from this user yet.</Text>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelected(null)}
            >
              <Icon name="close" color="#6b7280" size={24} />
            </TouchableOpacity>
            {selected && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selected.party_name}</Text>
                <Text style={styles.modalSub}>
                  Enquiry #{selected.id} · {formatDate(selected.created_at)}
                </Text>

                <DetailRow label="Contact name" value={selected.contact_name} />
                <DetailRow label="Mobile" value={selected.mobile} />
                <DetailRow label="Email" value={selected.email} />
                <DetailRow label="Address" value={selected.address} />
                <DetailRow label="GST No." value={selected.gst_no} />
                <DetailRow
                  label="Design requirement"
                  value={selected.design_requirement}
                />
                <DetailRow
                  label="Colour requirement"
                  value={selected.colour_requirement}
                />
                <DetailRow
                  label="Qty required"
                  value={
                    selected.qty_required
                      ? `${Number(selected.qty_required).toLocaleString()} m`
                      : null
                  }
                />
                <DetailRow
                  label="Price"
                  value={selected.price ? `₹${selected.price}/m` : null}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Detail Row Component
function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailKey}>{label}</Text>
      <Text style={styles.detailVal}>{value || '—'}</Text>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f6f2' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerName: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  refreshBtn: { padding: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e3e1da',
    borderRadius: 9,
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 10,
  },
  rowLeft: { flex: 1 },
  party: { fontSize: 13.5, fontWeight: '700', color: '#1f2937' },
  sub: { fontSize: 11.5, color: '#6b7280', marginTop: 2 },
  rowRight: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  qty: { fontSize: 13, color: '#374151' },
  qtyNum: { fontWeight: '700' },
  buttonContainer: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 6, backgroundColor: '#E3F2FD', borderRadius: 8 },
  deleteBtn: { padding: 6, backgroundColor: '#FFEBEE', borderRadius: 8 },
  empty: { textAlign: 'center', color: '#6b7280', fontSize: 13, marginTop: 40 },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f6f2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalClose: { position: 'absolute', top: 14, right: 16, zIndex: 1 },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
    paddingRight: 24,
  },
  modalSub: { fontSize: 11.5, color: '#6b7280', marginBottom: 14 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e1da',
  },
  detailKey: { fontSize: 13, color: '#6b7280' },
  detailVal: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '60%',
  },
});
