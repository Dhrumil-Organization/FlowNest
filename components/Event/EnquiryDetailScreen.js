// EnquiryDetailScreen.js
// Full enquiry detail — previously a full-screen Modal inside
// EnquiryReportDrilldownScreen, now a real navigator screen.
//
// Why: on Android, a ScrollView placed inside a <Modal> can fight with
// nested/horizontal ScrollViews for the touch gesture and refuse to scroll
// even with nestedScrollEnabled. A plain screen (pushed via
// navigation.navigate) doesn't have that problem — its ScrollView behaves
// like any other screen's ScrollView.

import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import { deleteEnquiries } from './syncService';

export default function EnquiryDetailScreen({ route, navigation }) {
  // `enquiry` = the row object (same shape as `selected` used to be).
  // `onDeleted` = optional callback so the list screen can refresh itself.
  const { enquiry, onDeleted } = route.params || {};
  const selected = enquiry;

  if (!selected) {
    // Defensive fallback — shouldn't normally happen.
    navigation.goBack();
    return null;
  }

  const formatDate = dateStr => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString() +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  const getField = (obj, key) => {
    if (!obj) return undefined;
    if (obj[key] !== undefined) return obj[key];
    const foundKey = Object.keys(obj).find(k => k.trim() === key);
    return foundKey ? obj[foundKey] : undefined;
  };

  const formatNum = val => {
    if (val === null || val === undefined || val === '') return '—';
    const n = Number(val);
    if (Number.isNaN(n)) return String(val);
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const handleEdit = () => {
    navigation.navigate('Event', {
      id: selected.id,
      prptype: selected.prptype,
    });
  };

  const handleDelete = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const user_prptype = await AsyncStorage.getItem('user_prptype');
      const result = await deleteEnquiries(
        selected.id,
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
        Alert.alert(`${result.message} for ${selected.party_name}!`);
        if (typeof onDeleted === 'function') onDeleted();
        navigation.goBack();
      }
    } catch (err) {
      console.log('LOAD ERROR =>', err);
    }
  };

  const renderDesignsTable = designs => {
    if (!Array.isArray(designs) || designs.length === 0) {
      return <Text style={styles.noDesignText}>No designs added</Text>;
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.designsTable}>
          <View style={styles.designsTableHeaderRow}>
            <Text style={[styles.designsHeaderCell, { width: 70 }]}>Code</Text>
            <Text style={[styles.designsHeaderCell, { width: 160 }]}>
              Design Name
            </Text>
            <Text style={[styles.designsHeaderCell, { width: 65 }]}>Qty</Text>
            <Text style={[styles.designsHeaderCell, { width: 55 }]}>Unit</Text>
            <Text style={[styles.designsHeaderCell, { width: 70 }]}>Rate</Text>
            <Text style={[styles.designsHeaderCell, { width: 100 }]}>
              Remark
            </Text>
            <Text style={[styles.designsHeaderCell, { width: 70 }]}>
              Status
            </Text>
          </View>

          {designs.map((d, dIdx) => {
            const isNew = d && (d.is_new === true || d.is_new_item === true);
            return (
              <View
                key={dIdx}
                style={[
                  styles.designsRow,
                  dIdx % 2 === 1 && styles.designsRowAlt,
                ]}
              >
                <Text style={[styles.designsCell, { width: 70 }]}>
                  {d.dsn_code || '—'}
                </Text>
                <Text
                  style={[styles.designsCell, { width: 160 }]}
                  numberOfLines={2}
                >
                  {d.dsn_name || '—'}
                </Text>
                <Text style={[styles.designsCell, { width: 65 }]}>
                  {formatNum(d.dsn_qty)}
                </Text>
                <Text style={[styles.designsCell, { width: 55 }]}>
                  {d.unit || '—'}
                </Text>
                <Text style={[styles.designsCell, { width: 70 }]}>
                  {formatNum(d.dsn_rate)}
                </Text>
                <Text
                  style={[styles.designsCell, { width: 100 }]}
                  numberOfLines={2}
                >
                  {d.remark || '—'}
                </Text>
                <View style={{ width: 70 }}>
                  {isNew ? (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  ) : (
                    <View style={styles.existingBadge}>
                      <Text style={styles.existingBadgeText}>Existing</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderItemsTable = (items, prptype) => {
    if (!Array.isArray(items) || items.length === 0) {
      return (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Items</Text>
          <Text style={styles.noItemsText}>
            No items added for this enquiry.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Items ({items.length})</Text>

        {items.map((it, idx) => {
          const designCount = Array.isArray(it.designs) ? it.designs.length : 0;
          const isNewItem =
            it &&
            (it.is_new === true ||
              getField(it, 'is_new_item') === true ||
              getField(it, 'is_new_item') === 'true' ||
              getField(it, 'is_new_item') === 1);

          const itemRate = getField(it, 'item_rate');
          const itemQty = getField(it, 'item_qty');
          const itemUnit = getField(it, 'item_unit');
          const itemRemark = getField(it, 'item_remark');
          const hasItemInfo =
            itemRate !== undefined ||
            itemQty !== undefined ||
            itemUnit !== undefined ||
            (itemRemark !== undefined && itemRemark !== '');

          return (
            <View
              key={it.item_code ? `${it.item_code}-${idx}` : idx}
              style={styles.itemCard}
            >
              <View style={styles.itemCardHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.itemCardTitle} numberOfLines={2}>
                    {it.item_name || '—'}
                  </Text>
                  <Text style={styles.itemCardMeta}>
                    Code: {it.item_code || '—'} · {designCount} design
                    {designCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                {isNewItem && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW ITEM</Text>
                  </View>
                )}
              </View>

              {hasItemInfo && prptype !== 'S' && (
                <View style={styles.itemInfoRow}>
                  <View style={styles.itemInfoCell}>
                    <Text style={styles.itemInfoLabel}>Rate</Text>
                    <Text style={styles.itemInfoValue}>
                      {formatNum(itemRate)}
                    </Text>
                  </View>
                  <View style={styles.itemInfoCell}>
                    <Text style={styles.itemInfoLabel}>Qty</Text>
                    <Text style={styles.itemInfoValue}>
                      {formatNum(itemQty)}
                    </Text>
                  </View>
                  <View style={styles.itemInfoCell}>
                    <Text style={styles.itemInfoLabel}>Unit</Text>
                    <Text style={styles.itemInfoValue}>{itemUnit || '—'}</Text>
                  </View>
                  <View style={[styles.itemInfoCell, { flex: 1.4 }]}>
                    <Text style={styles.itemInfoLabel}>Remark</Text>
                    <Text style={styles.itemInfoValue} numberOfLines={2}>
                      {itemRemark || '—'}
                    </Text>
                  </View>
                </View>
              )}
              {prptype === 'S' && (
                <View style={styles.itemCardBody}>
                  {renderDesignsTable(it.designs)}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.fullModalContainer}>
      <View style={styles.fullModalHeader}>
        <TouchableOpacity
          style={styles.fullModalBackBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" color={C.ink} size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.fullModalHeaderTitle} numberOfLines={1}>
            {selected.party_name}
          </Text>
          <Text style={styles.fullModalHeaderSub}>
            Enquiry #{selected.id} · {formatDate(selected.created_at)}
          </Text>
        </View>
        <View style={styles.fullModalHeaderActions}>
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
            <Icon name="edit" color="#2196F3" size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Icon name="delete" color="#F44336" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.fullModalScroll}
        contentContainerStyle={styles.fullModalContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Party Details</Text>
          <DetailRow label="Contact name" value={selected.contact_name} />
          <DetailRow label="Designation" value={selected.designation} />
          <DetailRow label="Mobile" value={selected.mobile} />
          <DetailRow label="Email" value={selected.email} />
          <DetailRow label="Address" value={selected.address} />
          <DetailRow label="GST No." value={selected.gst_no} />
          <DetailRow
            label="Property"
            value={
              selected.prptype === 'S'
                ? 'WEAVING'
                : selected.prptype === 'K'
                ? 'KNITTING'
                : selected.prptype === 'V'
                ? 'VENTURE'
                : selected.prptype === 'R'
                ? 'YARN'
                : '' || 'No prptype'
            }
          />
        </View>

        {renderItemsTable(selected.items, selected.prptype)}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailKey}>{label}</Text>
      <Text style={styles.detailVal}>{value || '—'}</Text>
    </View>
  );
}

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
  fullModalContainer: { flex: 1, backgroundColor: C.bg },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
    ...shadowSoft,
    marginTop: 25
  },
  fullModalBackBtn: { padding: 6 },
  fullModalHeaderTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  fullModalHeaderSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  fullModalHeaderActions: { flexDirection: 'row', gap: 8 },
  fullModalScroll: { flex: 1 },
  fullModalContent: { padding: 16, paddingBottom: 40 },

  editBtn: { padding: 8, backgroundColor: C.editBg, borderRadius: 9 },
  deleteBtn: { padding: 8, backgroundColor: C.deleteBg, borderRadius: 9 },

  sectionCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 14,
    ...shadowSoft,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.brand,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailKey: { fontSize: 13, color: C.muted },
  detailVal: {
    fontSize: 13,
    color: C.ink,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '60%',
  },

  itemCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: C.surface,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.headerBg,
  },
  itemCardTitle: { fontSize: 13, fontWeight: '800', color: C.ink },
  itemCardMeta: {
    fontSize: 10.5,
    color: C.muted,
    marginTop: 2,
    fontWeight: '600',
  },
  itemCardBody: { paddingVertical: 8, paddingHorizontal: 4 },

  itemInfoRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: '#FCFBF8',
  },
  itemInfoCell: { flex: 1, paddingRight: 6 },
  itemInfoLabel: {
    fontSize: 9.5,
    color: C.muted,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  itemInfoValue: { fontSize: 12, color: C.ink, fontWeight: '700' },

  designsTable: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  designsTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F0EBE1',
  },
  designsHeaderCell: {
    fontSize: 9.5,
    fontWeight: '800',
    color: C.muted,
    paddingVertical: 8,
    paddingHorizontal: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  designsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  designsRowAlt: { backgroundColor: '#FCFBF8' },
  designsCell: {
    fontSize: 11.5,
    color: C.ink,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontWeight: '600',
  },
  newBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  newBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#15803D' },
  existingBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  existingBadgeText: { fontSize: 9.5, fontWeight: '700', color: '#475569' },

  noDesignText: {
    fontSize: 11.5,
    color: C.muted,
    fontStyle: 'italic',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  noItemsText: {
    fontSize: 12.5,
    color: C.muted,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
});