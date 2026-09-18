import AppAlert from '@/common/utils/appAlert';
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";

import Icon from "@expo/vector-icons/MaterialIcons";
import WarehouseHeader from "./components/WarehouseHeader";
import { warehouseApi } from "./services/warehouseApi";
import CartonCard from "./components/CartonCard";
import { styles, COLORS } from "./components/WarehouseStyles";
import { API } from "@/common/API/dynamicAPI";
import axios from "axios";

const keyOf = item =>
  String(
    item?.cartonNo ||
    item?.cartno ||
    item?.CartNo ||
    item?.carcode ||
    item?.CarCode ||
    item?._scanCartonKey ||
    `${item?.uid || item?.UId || ""}_${item?.vouno || ""}_${item?.psrno || item?.srno || item?.SrNo || ""}`
  );

const searchable = item =>
  `
  ${item?.cartonNo || ""}
  ${item?.cartno || ""}
  ${item?.ItmName || ""}
  ${item?.itemName || ""}
  ${item?.ShdName || ""}
  ${item?.GrdName || ""}
  ${item?.MerName || ""}
  ${item?.vouNo || ""}
  ${item?.vouno || ""}
  ${item?.PackingNo || ""}
`.toLowerCase();

export default function WarehouseAssignScreen({ token, navigation, route }) {
  const { criteria = {}, location = {} } = route.params || {};

  const [itemText, setItemText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cartons, setCartons] = useState([]);
  const [selected, setSelected] = useState({});
  const [selectedOrder, setSelectedOrder] = useState([]);

  const selectedCount = Object.keys(selected).length;

  const filteredCartons = useMemo(() => {
    const s = searchText.trim().toLowerCase();

    const rows = s
      ? cartons.filter(x => searchable(x).includes(s))
      : cartons;

    const selectedMap = new Map();

    selectedOrder.forEach(key => {
      const found = rows.find(x => keyOf(x) === key);

      if (found) {
        selectedMap.set(key, found);
      }
    });

    const selectedRows = Array.from(selectedMap.values());

    const remainingRows = rows.filter(
      x => !selectedMap.has(keyOf(x))
    );

    return [...selectedRows, ...remainingRows];
  }, [cartons, searchText, selected, selectedOrder]);

  const getRequestConfig = () => ({
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-platform": "mob",
    },
  });

  console.log("location", location);

  const getCurrentFinancialYear = () => {
    const d = new Date();
    const fy = d.getMonth() + 1 >= 4 ? d.getFullYear() + 1 : d.getFullYear();
    return fy.toString().substring(2);
  };

  const loadData = async () => {
    if (!location?.locationCode && !location?.locationName && !location?.location) {
      return AppAlert.alert("Validation", "Location is required");
    }

    try {
      setLoading(true);
      setSelected({});
      setSearchText("");

      const payload = {
        PrpCode: criteria.prpcode,
        StrCode: criteria.strcode,
        YearNo: getCurrentFinancialYear(),
        GrdCode: "",
        ItmCode: "",
        MerCode: "",
        ShdCode: "",
        limit: "",
        page: "",
        search: "",
        selectedcarton: [],
        ttype: ["8", "3", "30", "2", "34", "32", "83", "994", "992"],
        txntype: "production_warehouse_locations",
        type: "S",
      };

      const res = await axios.post(`${API}/api/getcartondetail`, payload, getRequestConfig());
      console.log("Assign data response",res);
      const rows = res?.data?.response?.data || res?.data?.response?.results || [];
      console.log("Assign data rows",rows);
      setCartons(Array.isArray(rows) ? rows : []);
    } catch (e) {
      AppAlert.alert("Error", e?.response?.data?.message || "Failed to load cartons");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = item => {
    const key = keyOf(item);

    if (!key) {
      return AppAlert.alert("Validation", "Carton number missing");
    }

    setSelected(prev => {
      const next = { ...prev };

      if (next[key]) {
        delete next[key];

        setSelectedOrder(order =>
          order.filter(x => x !== key)
        );
      } else {
        next[key] = item;

        setSelectedOrder(order => [
          key,
          ...order.filter(x => x !== key),
        ]);
      }

      return next;
    });
  };

  const openScanner = scanType => {
  Keyboard.dismiss();

  if (!cartons.length) {
    return AppAlert.alert("Validation", "Please load carton data first");
  }

  navigation.navigate(
    scanType === "camera"
      ? "WarehouseQRCameraScanner"
      : "WarehouseQRScanner",
    {
      mode: "ASSIGN",
      cartons,
      selected,
      onScanResult: result => {
        const rows = Array.isArray(result) ? result : [result];
        const validRows = rows.filter(Boolean);

        if (!validRows.length) return;

        setSelected(prev => {
          const next = { ...prev };

          validRows.forEach(row => {
            const key = keyOf(row);
            if (key) {
              next[key] = row;
            }
          });

          return next;
        });

        setSelectedOrder(prev => {
          const newKeys = validRows.map(row => keyOf(row)).filter(Boolean);

          return [
            ...newKeys.reverse(),
            ...prev.filter(x => !newKeys.includes(x)),
          ];
        });
      },
    }
  );
};

  // const saveAssign = async () => {
  //   const selectedRows = Object.values(selected);

  //   if (!selectedRows.length) {
  //     return AppAlert.alert("Validation", "Please select at least one carton");
  //   }

  //   try {
  //     setLoading(true);

  //     const payload = {
  //       ...criteria,
  //       locationCode: location.locationCode || "",
  //       locationName: location.locationName || location.location || "",
  //       cartons: selectedRows,
  //     };

  //     const res = await warehouseApi.saveAssign(payload);

  //     AppAlert.alert("Success", res?.data?.message || "Assign saved successfully", [
  //       { text: "OK", onPress: () => navigation.goBack() },
  //     ]);
  //   } catch (e) {
  //     AppAlert.alert("Error", e?.response?.data?.message || "Failed to save assign");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const saveAssign = async () => {
    const selectedRows = Object.values(selected);

    if (!selectedRows.length) {
      return AppAlert.alert("Validation", "Please select at least one carton");
    }

    try {
      setLoading(true);

      const payload = {
        prpcode: criteria.prpcode,
        strcode: criteria.strcode,
        yearno: getCurrentFinancialYear(),
        itmcode: "",
        txntype: "production_warehouse_locations",
        selectedcartons: selectedRows,
        fromlocationdetail: [location],
        tolocationdetail: [],
        action: "assign",
      };

      console.log("assign save payload", payload);

      const res = await axios.post(
        `${API}/api/prodwarehousemanage`,
        payload,
        getRequestConfig()
      );

      console.log("response", res);

      if (res?.data?.success === false) {
        return AppAlert.alert(
          "Error",
          res?.data?.message || "Failed to save assign"
        );
      }

      AppAlert.alert("Success", res?.data?.message || "Assign saved successfully", [
        {
          text: "OK",
          onPress: () => {
            setSelected({});
            setSearchText("");
            navigation.goBack();
          },
        },
      ]);
    } catch (e) {
      AppAlert.alert(
        "Error",
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to save assign"
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <WarehouseHeader title="Assign Carton" navigation={navigation} />

          <View style={[styles.container, { paddingBottom: searchFocused ? 10 : 82 }]}>
            <View style={styles.card}>
              <View style={styles.between}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Icon name="place" size={18} color="#0f8f9a" />
                  <Text style={[styles.label, { marginLeft: 6 }]}>Location</Text>
                </View>

                <Text style={{ color: "#000", fontWeight: "900" }}>
                  {location.locationName || location.location}
                </Text>
              </View>

              <View style={styles.between}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Icon name="stacked-bar-chart" size={18} color="#0f8f9a" />
                  <Text style={[styles.label, { marginLeft: 6 }]}>Capacity</Text>
                </View>

                <Text style={{ color: "#000", fontWeight: "900" }}>
                  {location.used || location.occupancy || 0} / {location.capacity || 0}
                </Text>
              </View>

              {/* <Text style={styles.label}>
                Item Name <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={styles.input}
                value={itemText}
                onChangeText={setItemText}
                placeholder="Search or select item"
                placeholderTextColor="#9ca3af"
              /> */}

              <View style={{ flexDirection: "row", marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.button, { flex: 1, marginTop: 0 }]}
                  onPress={loadData}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Icon name="inventory-2" size={18} color="#fff" />
                      <Text style={[styles.buttonText, { marginLeft: 8 }]}>LOAD DATA</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openScanner("scanner")}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#0f8f9a",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#fff",
                    marginLeft: 8,
                  }}
                >
                  <Icon name="qr-code-scanner" size={28} color="#0f8f9a" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openScanner("camera")}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#0f8f9a",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#fff",
                    marginLeft: 8,
                  }}
                >
                  <Icon name="camera" size={28} color="#0f8f9a" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.row, { marginBottom: 10 }]}>
              <Icon name="search" size={20} color="#6b7280" />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 8 }]}
                value={searchText}
                onChangeText={setSearchText}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Manual search carton / item / shade / voucher"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.between}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Icon name="inventory" size={18} color="#0f8f9a" />
                <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>
                  Carton List ({filteredCartons.length})
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setSelected({});
                  setSelectedOrder([]);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Icon name="delete-sweep" size={16} color="#dc2626" />
                  <Text style={{ color: "#dc2626", fontWeight: "800", marginLeft: 4 }}>
                    Clear All
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredCartons}
              keyboardShouldPersistTaps="handled"
              extraData={{ selected, searchText }}
              keyExtractor={(item, index) =>
                `${index}_${item?.uid || item?.UId || ""}_${item?.cartno || item?.CartNo || ""}_${item?.vouno || ""}`
              }
              renderItem={({ item }) => {
                const rowKey = keyOf(item);

                return (
                  <CartonCard
                    item={item}
                    selected={!!selected[rowKey]}
                    onPress={toggleSelect}
                  />
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>No cartons available</Text>}
            />
          </View>

          {!searchFocused && (
            <View style={styles.bottomBar}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Icon name="check-circle" size={18} color="#fff" />
                <Text style={[styles.bottomText, { marginLeft: 6 }]}>
                  Selected: {selectedCount}
                </Text>
              </View>

              <TouchableOpacity style={styles.bottomButton} onPress={saveAssign}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Icon name="save-alt" size={18} color="#fff" />
                  <Text style={[styles.bottomButtonText, { marginLeft: 8 }]}>
                    SAVE ASSIGN
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}