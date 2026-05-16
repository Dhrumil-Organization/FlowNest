import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API } from '../../common/API/dynamicAPI';

const money = value => {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const ItemAddedSuccessScreen = ({ navigation, route }) => {
  const {
    item = {
      ItmCode: 'ITM-1001',
      ItmName: 'Cotton Shirt',
      DsnCode: 'D-1001',
      Shades: 5,
      Qty: 50,
      Pcs: 100,
      Rate: 450,
      Amount: 45000,
      Remark: '',
    },

    prpcode = '',
    strcode = '',
    yearno = '',
    token = '',

    editMode = false,
    editIndex = null,
    oldRow = null,

  } = route?.params || {};


  const addanotheritem = () => {
    navigation.navigate('SalesOrderItemList', {
      prpcode,
      strcode,
      yearno,
      token,
      // item: {
      //   ItmCode: selectedItem?.ItmCode,
      //   ItmName: selectedItem?.ItmName,
      //   DsnCode: selectedGrade?.DsnCode,
      //   Shades: selectedShades?.length || 0,
      //   Qty: qty,
      //   Pcs: pcs,
      //   Rate: rate,
      //   Amount: amount,
      //   Remark: remark,
      // },
      editMode,
      editIndex,
      oldRow,
    });

  };

  const summarylist = () => {
    const savedItem = {
      ItmCode: item?.ItmCode,
      ItmName: item?.ItmName,
      DsnCode: item?.DsnCode,
      Shades: item?.Shades,
      Qty: item?.Qty,
      Pcs: item?.Pcs,
      Rate: item?.Rate,
      Amount: item?.Amount,
      Remark: item?.Remark,
    };

    navigation.navigate('OrderSummaryScreen', {
      prpcode,
      strcode,
      yearno,
      token,

      savedItem,

      editMode,
      editIndex,
      oldRow,
    });

  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Main Card */}
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-ios-new" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Success Icon */}
          <View style={styles.successCircle}>
            <Icon name="check" size={44} color="#fff" />
          </View>

          {/* Title */}
          <Text style={styles.successText}>
            Item Added Successfully!
          </Text>

          {/* Item Card */}
          <View style={styles.itemCard}>
            <Text style={styles.itemTitle}>
              {item.ItmCode} - {item.ItmName}
            </Text>

            <Text style={styles.infoText}>
              <Text style={styles.label}>Design :</Text>{' '}
              {item.DsnCode}
            </Text>

            <Text style={styles.infoText}>
              <Text style={styles.label}>Shades :</Text>{' '}
              {item.Shades}
            </Text>

            <View style={styles.qtyRow}>

              <View style={styles.qtyBox}>
                <Text style={styles.qtyLabel}>Qty :</Text>
                <Text style={styles.qtyValue}>{item.Qty}</Text>
              </View>

              <View style={styles.pcsBox}>
                <Text style={styles.qtyLabel}>Pcs :</Text>
                <Text style={styles.qtyValue}>{item.Pcs}</Text>
              </View>

            </View>

            <Text style={styles.infoText}>
              <Text style={styles.label}>Rate</Text> : ₹{' '}
              {money(item.Rate)}
            </Text>

            <Text style={styles.amountText}>
              <Text style={styles.label}>Amount</Text> : ₹{' '}
              {money(item.Amount)}
            </Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => addanotheritem()}>
            <Text style={styles.addBtnText}>
              Add Another Item
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            // onPress={() => navigation.navigate('OrderSummaryScreen')}
            onPress={() => summarylist()}
          >
            <Text style={styles.backBtnText}>
              Back to Summary
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ItemAddedSuccessScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
  },

  header: {
    height: 52,
    backgroundColor: '#13879A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 38,
  },

  successCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#13879A',
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#13879A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.22,
    shadowRadius: 6,

    elevation: 4,
  },

  back: {
    color: '#FFFFFF',
    fontSize: 28,
    width: 30,
  },

  successText: {
    marginTop: 18,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 18,
    textAlign: 'center',
  },

  itemCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAF0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#000',
    marginBottom: 8,
    fontWeight: '500',
  },
  label: {
    color: '#111827',
    fontWeight: '600',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  amountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },

  addBtn: {
    width: '100%',
    height: 42,
    backgroundColor: '#13879A',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,

    shadowColor: '#13879A',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 5,

    elevation: 3,
  },

  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  backBtn: {
    width: '100%',
    height: 42,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFC7D1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#fff',
  },

  backBtnText: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '700',
  },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
  },
  pcsBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyLabel: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },

  qtyValue: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '500',
  },
});