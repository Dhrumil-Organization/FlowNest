// screens/StockDetailScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLUE = '#2148C8';

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailColon}>:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

export default function StockDetailScreen({ navigation, route }) {

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
    property       = '',
    year           = '',
    store          = '',
    updateStock    = 0,
    autoFound      = 0,
    manual         = 0,
    stockNotFound  = 0,
    autoNotFound   = 0,
    autoForRepacking = 0,
    duplicate      = 0,
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar backgroundColor={BLUE} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation && navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stock Detail</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ✅ Criteria Context Card — shows where this stock belongs */}
        <View style={styles.contextCard}>
          <View style={styles.contextRow}>
            <View style={styles.contextItem}>
              <Text style={styles.contextLabel}>Property</Text>
              <Text style={styles.contextValue}>{property || '—'}</Text>
            </View>
            <View style={styles.contextItem}>
              <Text style={styles.contextLabel}>Store</Text>
              <Text style={styles.contextValue}>{store || '—'}</Text>
            </View>
            <View style={styles.contextItem}>
              <Text style={styles.contextLabel}>Year</Text>
              <Text style={styles.contextValue}>{year || '—'}</Text>
            </View>
          </View>
          {/* Show which options are active (1) */}
          <View style={styles.optRow}>
            <Text style={styles.optLabel}>Active Options: </Text>
            <Text style={styles.optValue}>
              {[
                updateStock    === 1 && 'UpdateStock',
                autoFound      === 1 && 'AutoFound',
                manual         === 1 && 'Manual',
                stockNotFound  === 1 && 'StockNotFound',
                autoNotFound   === 1 && 'AutoNotFound',
                autoForRepacking === 1 && 'Repacking',
                duplicate      === 1 && 'Duplicate',
              ]
                .filter(Boolean)
                .join(', ') || 'None'}
            </Text>
          </View>
        </View>

        {/* Carton Header */}
        <View style={styles.cartonHeader}>
          <View style={styles.boxIcon}>
            <Text style={styles.boxEmoji}>📦</Text>
          </View>
          <View style={styles.cartonInfo}>
            <Text style={styles.cartonLabel}>Carton No</Text>
            <Text style={styles.cartonNo}>{item.id}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {/* Detail Fields */}
        <View style={styles.card}>
          <DetailRow label="Item"      value={item.item} />
          <DetailRow label="Merge"     value={item.merge} />
          <DetailRow label="Grade"     value={item.grade} />
          <DetailRow label="Shade"     value={item.shade} />
          <DetailRow label="Denier"    value={item.denier} />
          <DetailRow label="Chees"     value={item.chees} />
          <DetailRow label="Qty (KG)"  value={item.qty} />
          <DetailRow label="Gross Wt." value={item.grossWt} />
          <DetailRow label="Net Wt."   value={item.netWt} />
          <DetailRow label="User"      value={item.user} />
          <DetailRow label="Date"      value={item.date} />
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.printBtn} activeOpacity={0.85}>
          <Text style={styles.printBtnText}>PRINT STICKER</Text>
        </TouchableOpacity>

        {/* UPDATE STOCK only enabled if updateStock === 1 */}
        <TouchableOpacity
          style={[styles.updateBtn, updateStock !== 1 && styles.disabledBtn]}
          activeOpacity={updateStock === 1 ? 0.85 : 1}
          disabled={updateStock !== 1}
        >
          <Text style={styles.updateBtnText}>
            UPDATE STOCK {updateStock !== 1 ? '(Disabled)' : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.85} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>DELETE CARTON</Text>
        </TouchableOpacity>

      </ScrollView>
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
    borderLeftColor: BLUE,
  },
  contextRow: { flexDirection: 'row', marginBottom: 8 },
  contextItem: { flex: 1 },
  contextLabel: { fontSize: 10, color: '#888', marginBottom: 2 },
  contextValue: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  optRow: { flexDirection: 'row', flexWrap: 'wrap' },
  optLabel: { fontSize: 10, color: '#666', fontWeight: '600' },
  optValue: { fontSize: 10, color: BLUE, fontWeight: '600', flex: 1, flexWrap: 'wrap' },

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
  statusText: { color: BLUE, fontWeight: '700', fontSize: 12 },
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
    backgroundColor: BLUE,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: BLUE,
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
