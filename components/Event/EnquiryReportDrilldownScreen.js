// EnquiryReportDrilldownScreen.js
// Per-user enquiry drilldown: list, edit, delete. Tapping a row now
// navigates to a separate EnquiryDetailScreen (instead of opening a
// full-screen Modal) — this avoids the Android nested-ScrollView-in-Modal
// scrolling bug entirely.

import { API } from '../../common/API/dynamicAPI';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import api from './api';
import { deleteEnquiries } from './syncService';

export default function EnquiryReportDrilldownScreen({
  route,
  navigation,
  token,
  username,
}) {
  const { userId, userName, userRole, eventCode } = route.params;
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [getUserPrptype, setUserPrptype] = useState('');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user_prptype = await AsyncStorage.getItem('user_prptype');
        console.log('user_prptype', user_prptype);
        setUserPrptype(user_prptype);
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    initializeApp();
  }, [token, getUserPrptype]);

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

  // Handle Edit button press
  const handleEdit = item => {
    navigation.navigate('Event', {
      id: item.id,
      prptype: item.prptype || getUserPrptype,
    });
  };

  // Handle Delete button press
  const handleDelete = async item => {
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

  // Open the detail screen for a row (replaces the old setSelected(item) modal open)
  const openDetail = item => {
    navigation.navigate('EnquiryDetail', {
      enquiry: item,
      onDeleted: loadEnquiries,
    });
  };

  // Render each row in the FlatList
  const renderRow = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => openDetail(item)}>
      <View style={styles.rowLeft}>
        <Text style={styles.party}>{item.party_name}</Text>
        <Text style={styles.sub}>
          {item.contact_name || 'No contact name'} ·{' '}
          {formatDate(item.created_at)}
        </Text>
        <Text style={styles.sub}>
          {'Property: ' +
            (item.prptype === 'S'
              ? 'WEAVING'
              : item.prptype === 'K'
              ? 'KNITTING'
              : item.prptype === 'V'
              ? 'VENTURE'
              : item.prptype === 'R'
              ? 'YARN'
              : '' || 'No prptype')}
        </Text>
        {Array.isArray(item.items) && item.items.length > 0 && (
          <View style={styles.itemsBadge}>
            <Icon name="inventory-2" color="#B3552C" size={12} />
            <Text style={styles.itemsBadgeText}>
              {item.items.length} item{item.items.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
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
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Event Report Details'}
        subHeader={'Manage your event report details'}
      />
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
      </View>
    </>
  );
}

// Styles
const C = {
  brand: '#B3552C',
  ink: '#1F2937',
  body: '#374151',
  muted: '#6B7280',
  bg: '#FBFAF7',
  surface: '#FFFFFF',
  border: '#ECE9E2',
  editBg: '#E8F0FE',
  deleteBg: '#FDECEA',
  headerBg: '#F5F1EA',
};

const shadowSoft = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerName: { fontSize: 18, fontWeight: '800', color: C.ink },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surface,
    padding: 14,
    marginBottom: 10,
    ...shadowSoft,
  },
  rowLeft: { flex: 1 },
  party: { fontSize: 14, fontWeight: '800', color: C.ink },
  sub: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  itemsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: C.headerBg,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 6,
    gap: 4,
  },
  itemsBadgeText: { fontSize: 10.5, color: C.brand, fontWeight: '700' },
  rowRight: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  qty: { fontSize: 13, color: C.body },
  qtyNum: { fontWeight: '800' },
  buttonContainer: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 8, backgroundColor: C.editBg, borderRadius: 9 },
  deleteBtn: { padding: 8, backgroundColor: C.deleteBg, borderRadius: 9 },
  empty: { textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 40 },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
});
