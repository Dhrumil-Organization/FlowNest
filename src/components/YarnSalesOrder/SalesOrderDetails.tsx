import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API } from '../../common/API/dynamicAPI';
const num = v => {
  const n = parseFloat(String(v || '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};

const makeRowKey = row => `${row.ItmCode}_${row.GrdCode}_${row.ShdCode}`;

const createLineId = () =>
  `LINE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const SalesOrderDetails = ({ navigation, route }) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [editMode1, setEditMode] = useState(false);
  const parseMaybeJSON = (v) => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return v; }
    }
    return v;
  };

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
    selectedGrade = null,
    selectedShade = [], // Default to empty array
    workingRows = [],
    party = null,
    partyData = null,
    selectedParty = null,
    prpcode = '',
    strcode = '002',
    yearno = '',
    token = '',
  } = params || {};

  useEffect(() => {
    if (editMode === 'true') {
      setEditMode(true);
    } else {
      setEditMode(false);
    }
  }, [editMode]);

  console.log("edit mode SalesOrderDetails: ", editMode, editMode1);

  // Parse all stringified params
  const parsedOldRow = parseMaybeJSON(oldRow);
  const parsedSelectedItem = parseMaybeJSON(selectedItem);
  const parsedSelectedGrade = parseMaybeJSON(selectedGrade);
  const parsedSelectedShade = parseMaybeJSON(selectedShade) || []; // 👈 Parse selectedShade
  const parsedWorkingRows = parseMaybeJSON(workingRows) || [];
  const finalParty = parseMaybeJSON(party) || parseMaybeJSON(partyData) || parseMaybeJSON(selectedParty) || null;
  const stableUid =
    Number(uid || oldRow?.UId || workingRows?.[0]?.UId || 0);

  const stableMode =
    stableUid > 0 ? 'EDIT' : mode;

  const [qty, setQty] = useState('');
  const [pcs, setPcs] = useState('');
  const [rate, setRate] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  // STATES ADD KARO
  const [stockData, setStockData] = useState([]);
  const [totalStockQty, setTotalStockQty] = useState(0);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [isDyeing, setIsDyeing] = useState(0);


  console.log("remark", remark, isDyeing)
  console.log("parsedWorkingRows: ", workingRows, parsedWorkingRows);

  let cancelToken: any;

  const getRequestConfig = (props: any) => ({
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-platform': 'mob'
    },
    params: props.params,
    cancelToken: cancelToken?.token,
  });

  const amount = useMemo(() => {
    return (num(qty) * num(rate)).toFixed(2);
  }, [qty, rate]);

  useEffect(() => {
    if (editMode1 && oldRow) {
      setQty(String(oldRow.Qty ?? ''));
      setPcs(String(oldRow.Pcs ?? ''));
      setRate(String(oldRow.Rate ?? ''));
      setRemark(String(oldRow.Remark ?? ''));
    }
  }, [oldRow]);

  // const onSave = () => {
  //   if (!selectedItem?.ItmCode) {
  //     AppAlert.alert('Required', 'Item missing');
  //     return;
  //   }

  //   if (!selectedGrade?.GrdCode) {
  //     AppAlert.alert('Required', 'Grade missing');
  //     return;
  //   }

  //   // if (!selectedShade?.ShdCode) {
  //   //   AppAlert.alert('Required', 'Shade missing');
  //   //   return;
  //   // }

  //   if (!selectedShade || selectedShade.length === 0) {
  //     AppAlert.alert('Required', 'Please select shade');
  //     return;
  //   }

  //   if (num(qty) <= 0) {
  //     AppAlert.alert('Required', 'Enter valid qty');
  //     return;
  //   }

  //   if (num(rate) <= 0) {
  //     AppAlert.alert('Required', 'Enter valid rate');
  //     return;
  //   }

  //   const lineId =
  //     editMode1 && oldRow?.LineId
  //       ? oldRow.LineId
  //       : editLineId || createLineId();

  //   const newRow = {
  //     LineId: lineId,
  //     UId: stableUid,
  //     Mode: stableMode,
  //     SrNo:
  //       editMode1 && oldRow?.SrNo
  //         ? oldRow.SrNo
  //         : workingRows.length + 1,

  //     PrpCode: prpcode,
  //     StrCode: strcode,
  //     YearNo: yearno,

  //     ItmCode: selectedItem?.ItmCode || '',
  //     ItmName: selectedItem?.ItmName || '',
  //     MItmCode: selectedItem?.MItmCode || selectedItem?.ItmCode || '',

  //     GrdCode: selectedGrade?.GrdCode || '',
  //     GrdName: selectedGrade?.GrdName || '',

  //     ShdCode: selectedShade?.ShdCode || '',
  //     ShdName: selectedShade?.ShdName || '',

  //     Qty: num(qty),
  //     Pcs: num(pcs),
  //     Rate: num(rate),
  //     Amount: num(amount),
  //     Remark: remark,

  //     RowKey: `${selectedItem?.ItmCode || ''}_${selectedGrade?.GrdCode || ''}_${selectedShade?.ShdCode || ''}`,
  //   };

  //   let updatedRows = [];

  //   if (editMode1 && oldRow) {
  //     const editLineId = oldRow.LineId || newRow.LineId;

  //     let replaced = false;

  //     updatedRows = workingRows.map(row => {
  //       if (String(row.LineId) === String(editLineId)) {
  //         replaced = true;
  //         return { ...newRow, LineId: editLineId };
  //       }
  //       return row;
  //     });

  //     if (!replaced) {
  //       updatedRows = [...workingRows, newRow];
  //     }
  //   } else {
  //     const existsIndex = workingRows.findIndex(
  //       x => makeRowKey(x) === makeRowKey(newRow),
  //     );

  //     if (existsIndex >= 0) {
  //       AppAlert.alert(
  //         'Duplicate Shade',
  //         'This shade is already added for same item and design.',
  //       );
  //       return;
  //     }

  //     updatedRows = [...workingRows, newRow];
  //   }

  //   navigation.navigate('SalesOrderAddAnotherShade', {
  //     mode: stableMode,
  //     uid: stableUid,
  //     soNo,
  //     soDate,
  //     editMode1,
  //     editIndex,
  //     editLineId: lineId,
  //     oldRow,
  //     selectedItem,
  //     selectedGrade,
  //     selectedShade,
  //     lastRow: newRow,
  //     workingRows: updatedRows,
  //     party: finalParty,
  //     partyData: finalParty,
  //     selectedParty: finalParty,
  //     prpcode,
  //     strcode,
  //     yearno,
  //     token,
  //   });
  // };

  // const onSave = () => {

  //   if (!selectedItem?.ItmCode) {
  //     AppAlert.alert('Required', 'Item missing');
  //     return;
  //   }

  //   if (!selectedGrade?.GrdCode) {
  //     AppAlert.alert('Required', 'Grade missing');
  //     return;
  //   }

  //   // MULTIPLE SHADE VALIDATION
  //   if (!selectedShade || selectedShade.length === 0) {
  //     AppAlert.alert('Required', 'Please select shade');
  //     return;
  //   }

  //   if (num(qty) <= 0) {
  //     AppAlert.alert('Required', 'Enter valid qty');
  //     return;
  //   }

  //   if (num(rate) <= 0) {
  //     AppAlert.alert('Required', 'Enter valid rate');
  //     return;
  //   }

  //   let updatedRows = [...workingRows];

  //   let latestRow = null;

  //   // MULTIPLE SHADE LOOP
  //   selectedShade.forEach((shadeItem, index) => {

  //     const lineId =
  //       editMode1 && oldRow?.LineId
  //         ? oldRow.LineId
  //         : createLineId();

  //     const newRow = {

  //       LineId: lineId,

  //       UId: stableUid,

  //       Mode: stableMode,

  //       SrNo:
  //         editMode1 && oldRow?.SrNo
  //           ? oldRow.SrNo
  //           : updatedRows.length + 1,

  //       PrpCode: prpcode,

  //       StrCode: strcode,

  //       YearNo: yearno,

  //       ItmCode: selectedItem?.ItmCode || '',

  //       ItmName: selectedItem?.ItmName || '',

  //       Denier: selectedItem.Denier,

  //       UOM: selectedItem.UOM,
  //       HsnCode: selectedItem.HsnCode,

  //       MItmCode:
  //         selectedItem?.MItmCode ||
  //         selectedItem?.ItmCode ||
  //         '',

  //       GrdCode: selectedGrade?.GrdCode || '',

  //       GrdName: selectedGrade?.GrdName || '',

  //       // MULTIPLE SHADE
  //       ShdCode: shadeItem?.ShdCode || '',

  //       ShdName:
  //         shadeItem?.ShdName ||
  //         shadeItem?.ShadeName ||
  //         '',

  //       Qty: num(qty),

  //       Pcs: num(pcs),

  //       Rate: num(rate),

  //       Amount: num(amount),

  //       Remark: remark,

  //       IsDyeing: isDyeing ? 1 : 0,

  //       RowKey:
  //         `${selectedItem?.ItmCode || ''}_` +
  //         `${selectedGrade?.GrdCode || ''}_` +
  //         `${shadeItem?.ShdCode || ''}`,
  //     };

  //     latestRow = newRow;

  //     // EDIT MODE
  //     if (editMode1 && oldRow) {

  //       const editLineId =
  //         oldRow.LineId || newRow.LineId;

  //       let replaced = false;

  //       updatedRows = updatedRows.map(row => {

  //         if (
  //           String(row.LineId) ===
  //           String(editLineId)
  //         ) {
  //           replaced = true;

  //           return {
  //             ...newRow,
  //             LineId: editLineId,
  //           };
  //         }

  //         return row;
  //       });

  //       if (!replaced) {
  //         updatedRows.push(newRow);
  //       }

  //     } else {

  //       // DUPLICATE CHECK
  //       const existsIndex = updatedRows.findIndex(
  //         x => makeRowKey(x) === makeRowKey(newRow),
  //       );

  //       if (existsIndex >= 0) {
  //         return;
  //       }

  //       updatedRows.push(newRow);
  //     }

  //   });

  //   console.log("updatedRows", updatedRows);

  //   // navigation.navigate(
  //   //   'SalesOrderAddAnotherShade',
  //   //   {
  //   //     mode: stableMode,
  //   //     uid: stableUid,
  //   //     soNo: soNo,
  //   //     soDate: soDate,

  //   //     editMode1: editMode1,
  //   //     editIndex: editIndex,

  //   //     oldRow: oldRow,

  //   //     selectedItem: selectedItem,
  //   //     selectedGrade: selectedGrade,

  //   //     // IMPORTANT
  //   //     selectedShade: selectedShade,

  //   //     lastRow: latestRow,

  //   //     workingRows: updatedRows,

  //   //     party: finalParty,
  //   //     partyData: finalParty,
  //   //     selectedParty: finalParty,

  //   //     prpcode: prpcode,
  //   //     strcode: strcode,
  //   //     yearno: yearno,
  //   //     token: token,
  //   //   }
  //   // );

  //   router.push({
  //     pathname: '/SOPartyDetailsPart1',
  //     params: {
  //       mode: stableMode,
  //       uid: stableUid,
  //       soNo: soNo,
  //       soDate: soDate,

  //       editMode1: editMode1,
  //       editIndex: editIndex,

  //       oldRow: oldRow,

  //       selectedItem: selectedItem,
  //       selectedGrade: selectedGrade,

  //       // IMPORTANT
  //       selectedShade: selectedShade,

  //       lastRow: latestRow,

  //       workingRows: updatedRows,

  //       party: finalParty,
  //       partyData: finalParty,
  //       selectedParty: finalParty,

  //       prpcode: prpcode,
  //       strcode: strcode,
  //       yearno: yearno,
  //       token: token,
  //     }
  //   });
  // };

  const onSave = () => {
    if (!parsedSelectedItem?.ItmCode) {
      AppAlert.alert('Required', 'Item missing');
      return;
    }

    if (!parsedSelectedGrade?.GrdCode) {
      AppAlert.alert('Required', 'Grade missing');
      return;
    }

    // Use parsedSelectedShade
    if (!parsedSelectedShade || parsedSelectedShade.length === 0) {
      AppAlert.alert('Required', 'Please select shade');
      return;
    }

    if (num(qty) <= 0) {
      AppAlert.alert('Required', 'Enter valid qty');
      return;
    }

    if (num(rate) <= 0) {
      AppAlert.alert('Required', 'Enter valid rate');
      return;
    }

    let updatedRows = [...parsedWorkingRows];
    let latestRow = null;

    // Loop through parsedSelectedShade
    parsedSelectedShade.forEach((shadeItem, index) => {
      const lineId = editMode1 && parsedOldRow?.LineId ? parsedOldRow.LineId : createLineId();

      const newRow = {
        LineId: lineId,
        UId: stableUid,
        Mode: stableMode,
        SrNo: editMode1 && parsedOldRow?.SrNo ? parsedOldRow.SrNo : updatedRows.length + 1,
        PrpCode: prpcode,
        StrCode: strcode,
        YearNo: yearno,
        ItmCode: parsedSelectedItem?.ItmCode || '',
        ItmName: parsedSelectedItem?.ItmName || '',
        Denier: parsedSelectedItem.Denier,
        UOM: parsedSelectedItem.UOM,
        HsnCode: parsedSelectedItem.HsnCode,
        MItmCode: parsedSelectedItem?.MItmCode || parsedSelectedItem?.ItmCode || '',
        GrdCode: parsedSelectedGrade?.GrdCode || '',
        GrdName: parsedSelectedGrade?.GrdName || '',
        ShdCode: shadeItem?.ShdCode || '',
        ShdName: shadeItem?.ShdName || shadeItem?.ShadeName || '',
        Qty: num(qty),
        Pcs: num(pcs),
        Rate: num(rate),
        Amount: num(amount),
        Remark: remark,
        IsDyeing: isDyeing ? 1 : 0,
        RowKey: `${parsedSelectedItem?.ItmCode || ''}_${parsedSelectedGrade?.GrdCode || ''}_${shadeItem?.ShdCode || ''}`,
      };

      latestRow = newRow;

      if (editMode1 && parsedOldRow) {
        const editLineId = parsedOldRow.LineId || newRow.LineId;
        let replaced = false;

        updatedRows = updatedRows.map(row => {
          if (String(row.LineId) === String(editLineId)) {
            replaced = true;
            return { ...newRow, LineId: editLineId };
          }
          return row;
        });

        if (!replaced) {
          updatedRows.push(newRow);
        }
      } else {
        const existsIndex = updatedRows.findIndex(x => makeRowKey(x) === makeRowKey(newRow));
        if (existsIndex >= 0) {
          return;
        }
        updatedRows.push(newRow);
      }
    });
    const isEditMode = editMode === true || editMode === 'true';
    router.push({
      pathname: '/SalesOrderAddAnotherShade',
      params: {
        mode: stableMode,
        uid: stableUid,
        soNo: soNo,
        soDate: soDate,
        editMode: isEditMode,
        editIndex: editIndex,
        oldRow: JSON.stringify(parsedOldRow),
        selectedItem: JSON.stringify(parsedSelectedItem),
        selectedGrade: JSON.stringify(parsedSelectedGrade),
        selectedShade: JSON.stringify(parsedSelectedShade), // 👈 Stringify parsedSelectedShade
        lastRow: JSON.stringify(latestRow),
        workingRows: JSON.stringify(updatedRows),
        party: JSON.stringify(finalParty),
        partyData: JSON.stringify(finalParty),
        selectedParty: JSON.stringify(finalParty),
        prpcode: prpcode,
        strcode: strcode,
        yearno: yearno,
        token: token,
      }
    });
  };

  // const handleaddstock = async () => {

  //   const yrno = yearno ? yearno.slice(-2) : '';

  //   const userPtype = await AsyncStorage.getItem('user_prptype');

  //   try {

  //     setLoading(true);
  //     const shadeArray = Array.isArray(parsedSelectedShade)
  //       ? parsedSelectedShade
  //       : [parsedSelectedShade];

  //     const lastRow = workingRows?.length > 0 ? workingRows[workingRows.length - 1] : null;

  //     const lastSrNo =
  //       Number(lastRow?.SrNo || 0);

  //     const d1 = shadeArray.map((shadeItem, index) => ({
  //       srno: oldRow?.SrNo ? Number(oldRow?.SrNo) : lastSrNo + index + 1,
  //       itmcode: parsedSelectedItem?.ItmCode || oldRow?.ItmCode || '',
  //       grdcode: parsedSelectedGrade?.GrdCode || oldRow?.GrdCode || '',
  //       shdcode: shadeItem?.ShdCode || oldRow?.ShdCode || '',
  //     }));

  //     const selectedd1 =
  //       workingRows?.length > 0
  //         ? workingRows.map(row => ({

  //           srno:
  //             row?.SrNo || 0,

  //           itmcode:
  //             row?.ItmCode || '',

  //           grdcode:
  //             row?.GrdCode || '',

  //           shdcode:
  //             row?.ShdCode || '',
  //         }))
  //         : [];

  //     const payload = {

  //       prptype: userPtype,

  //       prpcode,

  //       strcode,

  //       yearno: yrno,

  //       d1,

  //       selectedd1,

  //     };

  //     console.log(
  //       'stock payload:', JSON.stringify(payload, null, 2)
  //     );

  //     const res = await axios.post(
  //       `${API}/api/get_so_current_stock`,
  //       payload,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
  //           Accept: 'application/json', 'x-platform': 'mob',
  //         },
  //       });

  //     console.log('stock Response:', res);

  //     // const data = res.data?.response?.data || res.data?.response || res.data?.data || [];

  //     const data = res.data?.response?.data || res.data?.response || res.data?.data || [];

  //     console.log('stock data:', data);

  //     const stockRows = data?.stockdata || [];

  //     setStockData(stockRows);

  //     const totalQty = stockRows.reduce(
  //       (sum, item) => sum + Number(item?.StkQty || 0),
  //       0
  //     );

  //     setTotalStockQty(totalQty);


  //     if (totalQty > 0) {

  //       setIsDyeing(1);

  //     } else {

  //       setIsDyeing(0);
  //     }

  //     console.log('TOTAL STOCK:', totalQty);

  //     console.log('stock data:', data);

  //   } catch (error) {

  //     console.log('get stock ERROR:', error?.response?.data || error.message);

  //     AppAlert.alert('Error', 'Unable to get stock');

  //   } finally {

  //     setLoading(false);

  //   }
  // };


  const handleaddstock = async () => {
    const yrno = yearno ? yearno.slice(-2) : '';
    const userPtype = await AsyncStorage.getItem('user_prptype');

    try {
      setLoading(true);
      const shadeArray = Array.isArray(parsedSelectedShade)
        ? parsedSelectedShade
        : [parsedSelectedShade];

      // Use parsedWorkingRows instead of workingRows
      const lastRow = parsedWorkingRows?.length > 0
        ? parsedWorkingRows[parsedWorkingRows.length - 1]
        : null;
      const lastSrNo = Number(lastRow?.SrNo || 0);

      // Use parsedOldRow instead of oldRow
      const d1 = shadeArray.map((shadeItem, index) => ({
        srno: parsedOldRow?.SrNo ? Number(parsedOldRow?.SrNo) : lastSrNo + index + 1,
        itmcode: parsedSelectedItem?.ItmCode || parsedOldRow?.ItmCode || '',
        grdcode: parsedSelectedGrade?.GrdCode || parsedOldRow?.GrdCode || '',
        shdcode: shadeItem?.ShdCode || parsedOldRow?.ShdCode || '',
      }));

      // Use parsedWorkingRows for selectedd1
      const selectedd1 = parsedWorkingRows?.length > 0
        ? parsedWorkingRows.map(row => ({
          srno: row?.SrNo || 0,
          itmcode: row?.ItmCode || '',
          grdcode: row?.GrdCode || '',
          shdcode: row?.ShdCode || '',
        }))
        : [];

      const payload = {
        prptype: userPtype,
        prpcode,
        strcode,
        yearno: yrno,
        d1,
        selectedd1,
      };

      console.log('stock payload:', JSON.stringify(payload, null, 2));

      const res = await axios.post(
        `${API}/api/get_so_current_stock`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-platform': 'mob',
          },
        }
      );

      console.log('stock Response:', res.data);
      const data = res.data?.response?.data || res.data?.response || res.data?.data || [];
      const stockRows = data?.stockdata || [];
      setStockData(stockRows);

      const totalQty = stockRows.reduce(
        (sum, item) => sum + Number(item?.StkQty || 0),
        0
      );
      setTotalStockQty(totalQty);
      setIsDyeing(totalQty > 0 ? 1 : 0);
    } catch (error) {
      console.log('get stock ERROR:', error?.response?.data || error.message);
      AppAlert.alert(
        'Error',
        `Unable to get stock. Error: ${error?.response?.data?.message || error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   const shadeArray = Array.isArray(parsedSelectedShade)
  //     ? parsedSelectedShade
  //     : [parsedSelectedShade];

  //   if (parsedSelectedItem?.ItmCode && parsedSelectedGrade?.GrdCode && shadeArray?.length > 0) {
  //     handleaddstock();
  //   }
  // }, []);
  useEffect(() => {
    const shadeArray = Array.isArray(parsedSelectedShade)
      ? parsedSelectedShade
      : [parsedSelectedShade];

    if (
      parsedSelectedItem?.ItmCode &&
      parsedSelectedGrade?.GrdCode &&
      shadeArray?.length > 0
    ) {
      handleaddstock();
    } else {
      console.log(
        'Missing data:',
        !parsedSelectedItem?.ItmCode ? 'Item missing' : '',
        !parsedSelectedGrade?.GrdCode ? 'Grade missing' : '',
        shadeArray?.length === 0 ? 'Shade missing' : ''
      );
    }
  }, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back-ios-new" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {editMode1 ? 'Modify Details' : 'Enter Details'}
        </Text>

        <View style={{ width: 22 }} />
      </View>


      {/* STOCK DETAILS MODAL */}
      <Modal
        visible={stockModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>

          <View style={styles.modalContent}>

            {/* HEADER */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Stock Details
              </Text>

              <TouchableOpacity
                onPress={() => setStockModalVisible(false)}
              >
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* LIST */}
            {/* <FlatList
              data={stockData}
              keyExtractor={(item, index) => index.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.stockCard}>

                  <View style={styles.stockTopRow}>
                    <Text style={styles.stockMer}>
                      {item?.MerCode}
                    </Text>

                    <Text style={styles.stockQty}>
                      {Number(item?.StkQty || 0).toFixed(3)}
                    </Text>
                  </View>

                  <Text style={styles.stockName}>
                    {item?.MerName}
                  </Text>

                  <View style={styles.stockBottomRow}>
                    <Text style={styles.stockSmall}>
                      Carton : {item?.TotCarton}
                    </Text>

                  </View>

                </View>
              )}
            /> */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
            >
              {stockData?.map((item, index) => (
                <View key={index} style={styles.stockCard}>

                  <View style={styles.stockTopRow}>
                    <Text style={styles.stockMer}>
                      {item?.MerCode}
                    </Text>

                    <Text style={styles.stockQty}>
                      {Number(item?.StkQty || 0).toFixed(3)}
                    </Text>
                  </View>

                  <Text style={styles.stockName}>
                    {item?.MerName}
                  </Text>

                  <View style={styles.stockBottomRow}>
                    <Text style={styles.stockSmall}>
                      Carton : {item?.TotCarton}
                    </Text>
                  </View>

                </View>
              ))}
            </ScrollView>

          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
          <Text style={styles.label}>Item</Text>
          <Text style={styles.value}>
            {parsedSelectedItem?.ItmCode} - {parsedSelectedItem?.ItmName}
          </Text>

          <Text style={styles.label}>Grade</Text>
          <Text style={styles.value}>
            {parsedSelectedGrade?.GrdCode} - {parsedSelectedGrade?.GrdName}
          </Text>

          <Text style={styles.label}>Shade</Text>
          <Text style={styles.value}>
            {/* {selectedShade?.ShdCode} - {selectedShade?.ShdName}            */}
            {/* <Text style={styles.value}>
              {selectedShade?.map((x, i) => (
                <Text key={i} style={styles.value}>
                  {x?.ShdCode} - {x?.ShdName || x?.ShadeName}
                </Text>
              ))}
            </Text> */}
            <Text style={styles.value1}>
              {Array.isArray(parsedSelectedShade)
                ? parsedSelectedShade
                  .map(x => `${x?.ShdCode} - ${x?.ShdName || x?.ShadeName}`)
                  .join(', ')
                : `${parsedSelectedShade?.ShdCode} - ${parsedSelectedShade?.ShdName || parsedSelectedShade?.ShadeName}`}
            </Text>
          </Text>
        </View>

        {/* TOTAL STOCK */}
        <View style={styles.stockRow}>
          <View>
            <Text style={styles.stockLabel}>Available Stock</Text>

            <Text style={styles.stockValue}>
              {Number(totalStockQty).toFixed(3)}
            </Text>
          </View>

          <View style={styles.checkboxRow}>

            <TouchableOpacity
              onPress={() => {

                setIsDyeing(prev =>
                  prev === 1 ? 0 : 1
                );

              }}
            >

              <Icon
                name={
                  isDyeing === 1
                    ? 'check-box'
                    : 'check-box-outline-blank'
                }
                size={24}
                color={
                  totalStockQty > 0
                    ? '#13879A'
                    : '#999'
                }
              />

            </TouchableOpacity>

            <Text
              style={[
                styles.checkboxLabel,
                {
                  color: '#000'
                }
              ]}
            >
              Stock Sales
            </Text>

          </View>

          {/* INFO BUTTON */}
          <TouchableOpacity
            style={styles.infoBtn}
            onPress={() => setStockModalVisible(true)}
          >
            <Icon name="info-outline" size={22} color="#13879A" />
          </TouchableOpacity>
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
          // onChangeText={setPcs}
          onChangeText={(text) => setPcs(text || '0')}
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
            {editMode1 ? 'Update Shade' : 'Add This Shade'}
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
  value1: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    flexWrap: 'wrap',
    flexShrink: 1,
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
  stockRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stockLabel: {
    fontSize: 10,
    color: '#000',
    fontWeight: '800',
  },

  stockValue: {
    fontSize: 20,
    color: '#13879A',
    fontWeight: '900',
    marginTop: 4,
  },

  infoBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    maxHeight: '70%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#101828',
  },

  stockCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E7EF',
  },

  stockTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stockMer: {
    fontSize: 15,
    fontWeight: '900',
    color: '#101828',
  },

  stockQty: {
    fontSize: 16,
    fontWeight: '900',
    color: '#13879A',
  },

  stockName: {
    marginTop: 6,
    fontSize: 13,
    color: '#475467',
    fontWeight: '700',
  },

  stockBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  stockSmall: {
    fontSize: 12,
    color: '#667085',
    fontWeight: '700',
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  checkboxLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#101828',
    marginLeft: 8,
  },
});