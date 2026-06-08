import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  // SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

const num = v => {
  const n = parseFloat(String(v || '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};

const makeRowKey = row => `${row.ItmCode}_${row.DsnCode}_${row.ShdCode}`;

const createLineId = () =>
  `LINE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const SalesOrderDetails = ({ navigation, route }) => {
  const {
    mode = 'ADD',
    uid = 0,
    soNo = '',
    soDate = '',
    editMode = false,
    editIndex = null,
    editLineId = null,
    oldRow = null,

    selectedItem = null,
    selectedDesign = null,
    selectedShade = null,

    workingRows = [],

    party = null,
    partyData = null,
    selectedParty = null,

    prpcode = '',
    strcode = '012',
    yearno = '',
    token = '',
  } = route?.params || {};

  const finalParty = party || partyData || selectedParty || null;
  const stableUid =
    Number(uid || oldRow?.UId || workingRows?.[0]?.UId || 0);

  const stableMode =
    stableUid > 0 ? 'EDIT' : mode;

  const [qty, setQty] = useState('');
  const [pcs, setPcs] = useState('');
  const [rate, setRate] = useState('');
  const [remark, setRemark] = useState('');

  const amount = useMemo(() => {
    return (num(qty) * num(rate)).toFixed(2);
  }, [qty, rate]);

  useEffect(() => {
    if (editMode && oldRow) {
      setQty(String(oldRow.Qty ?? ''));
      setPcs(String(oldRow.Pcs ?? ''));
      setRate(String(oldRow.Rate ?? ''));
      setRemark(String(oldRow.Remark ?? ''));
    }
  }, [editMode, oldRow]);

  const onSave = () => {
    if (!selectedItem?.ItmCode) {
      Alert.alert('Required', 'Item missing');
      return;
    }

    if (!selectedDesign?.DsnCode) {
      Alert.alert('Required', 'Design missing');
      return;
    }

    if (!selectedShade?.ShdCode) {
      Alert.alert('Required', 'Shade missing');
      return;
    }

    if (num(qty) <= 0) {
      Alert.alert('Required', 'Enter valid qty');
      return;
    }

    if (num(rate) <= 0) {
      Alert.alert('Required', 'Enter valid rate');
      return;
    }

    const lineId =
      editMode && oldRow?.LineId
        ? oldRow.LineId
        : editLineId || createLineId();

    const newRow = {
      LineId: lineId,
      UId: stableUid,
      Mode: stableMode,
      SrNo:
        editMode && oldRow?.SrNo
          ? oldRow.SrNo
          : workingRows.length + 1,

      PrpCode: prpcode,
      StrCode: strcode,
      YearNo: yearno,

      ItmCode: selectedItem?.ItmCode || '',
      ItmName: selectedItem?.ItmName || '',
      MItmCode: selectedItem?.MItmCode || selectedItem?.ItmCode || '',

      Denier: selectedItem.Denier,

      UOM: selectedItem.UOM,
      HsnCode: selectedItem.HsnCode,

      DsnCode: selectedDesign?.DsnCode || '',
      DsnName: selectedDesign?.DsnName || '',

      ShdCode: selectedShade?.ShdCode || '',
      ShdName: selectedShade?.ShdName || '',

      Qty: num(qty),
      Pcs: num(pcs),
      Rate: num(rate),
      Amount: num(amount),
      Remark: remark,

      RowKey: `${selectedItem?.ItmCode || ''}_${selectedDesign?.DsnCode || ''}_${selectedShade?.ShdCode || ''}`,
    };

    let updatedRows = [];

    if (editMode && oldRow) {
      const editLineId = oldRow.LineId || newRow.LineId;

      let replaced = false;

      updatedRows = workingRows.map(row => {
        if (String(row.LineId) === String(editLineId)) {
          replaced = true;
          return { ...newRow, LineId: editLineId };
        }
        return row;
      });

      if (!replaced) {
        updatedRows = [...workingRows, newRow];
      }
    } else {
      // const existsIndex = workingRows.findIndex(
      //   x => makeRowKey(x) === makeRowKey(newRow),
      // );

      // if (existsIndex >= 0) {
      //   Alert.alert(
      //     'Duplicate Shade',
      //     'This shade is already added for same item and design.',
      //   );
      //   return;
      // }

      const existsIndex = workingRows.findIndex(
        x => makeRowKey(x) === makeRowKey(newRow),
      );

      const shadeName = String(newRow.ShdName || '').trim().toLowerCase();

      if (existsIndex >= 0
        && shadeName !== 'apc'
      ) {
        Alert.alert(
          'Duplicate Shade',
          'This shade is already added for same item and design.',
        );
        return;
      }

      updatedRows = [...workingRows, newRow];
    }

    navigation.navigate('SalesOrderAddAnotherShade', {
      mode: stableMode,
      uid: stableUid,
      soNo,
      soDate,
      editMode,
      editIndex,
      editLineId: lineId,
      oldRow,

      selectedItem,
      selectedDesign,
      selectedShade,

      lastRow: newRow,
      workingRows: updatedRows,

      party: finalParty,
      partyData: finalParty,
      selectedParty: finalParty,

      prpcode,
      strcode,
      yearno,
      token,
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios-new" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {editMode ? 'Modify Details' : 'Enter Details'}
        </Text>

        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
          <Text style={styles.label}>Item</Text>
          <Text style={styles.value}>
            {selectedItem?.ItmCode} - {selectedItem?.ItmName}
          </Text>

          <Text style={styles.label}>Design</Text>
          <Text style={styles.value}>
            {selectedDesign?.DsnCode} - {selectedDesign?.DsnName}
          </Text>

          <Text style={styles.label}>Shade</Text>
          <Text style={styles.value}>
            {selectedShade?.ShdCode} - {selectedShade?.ShdName}
          </Text>
        </View>

        <Text style={styles.inputLabel}>Qty</Text>
        <TextInput
          value={qty}
          onChangeText={setQty}
          keyboardType="numeric"
          style={styles.input}
          placeholder="Enter qty"
        />

        <Text style={styles.inputLabel}>Pcs</Text>
        <TextInput
          value={pcs}
          onChangeText={setPcs}
          keyboardType="numeric"
          style={styles.input}
          placeholder="Enter pcs"
        />

        <Text style={styles.inputLabel}>Rate</Text>
        <TextInput
          value={rate}
          onChangeText={setRate}
          keyboardType="numeric"
          style={styles.input}
          placeholder="Enter rate"
        />

        <Text style={styles.inputLabel}>Amount</Text>
        <TextInput
          editable={false}
          value={amount}
          style={[styles.input, styles.disabled]}
        />

        <Text style={styles.inputLabel}>Remark</Text>
        <TextInput
          value={remark}
          onChangeText={setRemark}
          style={[styles.input, styles.remark]}
          multiline
          placeholder="Enter remark"
        />

        <TouchableOpacity style={styles.btn} onPress={onSave}>
          <Text style={styles.btnText}>
            {editMode ? 'Update Shade' : 'Add This Shade'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SalesOrderDetails;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FB' },
  header: {
    height: 56,
    backgroundColor: '#13879A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  container: { flex: 1, padding: 14 },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4E7EF',
    marginBottom: 12,
  },
  label: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  value: {
    color: '#101828',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
  },
  inputLabel: {
    marginTop: 12,
    marginBottom: 6,
    color: '#101828',
    fontWeight: '900',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E7EF',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#101828',
  },
  disabled: {
    backgroundColor: '#EEF2F6',
    color: '#101828',
    fontWeight: '900',
  },
  remark: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  btn: {
    backgroundColor: '#13879A',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});