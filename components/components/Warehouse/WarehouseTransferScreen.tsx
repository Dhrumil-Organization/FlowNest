import AppAlert from '@/common/utils/appAlert';
import React, { useMemo, useState, useEffect } from "react";
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
  Modal
} from "react-native";

import Icon from "@expo/vector-icons/MaterialIcons";
import WarehouseHeader from "./components/WarehouseHeader";
import { warehouseApi } from "./services/warehouseApi";
import CartonCard from "./components/CartonCard";
import { styles, COLORS } from "./components/WarehouseStyles";
import { API } from "@/common/API/dynamicAPI";
import axios from "axios";
import AsyncStorage from '@/common/utils/compatibleStorage';

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

export default function WarehouseTransferScreen({ token, navigation, route }) {
  const { criteria = {}, location = {} } = route.params || {};

  const [toLocation, setToLocation] = useState("");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cartons, setCartons] = useState([]);
  const [selected, setSelected] = useState({});
  const [selectedOrder, setSelectedOrder] = useState([]);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationData, setLocationData] = useState([]);
  const [locationSearch, setLocationSearch] = useState("");

  const selectedCount = Object.keys(selected).length;


  const getCurrentFinancialYear = () => {
    const d = new Date();
    const fy = d.getMonth() + 1 >= 4 ? d.getFullYear() + 1 : d.getFullYear();
    return fy.toString().substring(2);
  };

  const getRequestConfig = () => ({
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-platform": "mob",
    },
  });



  // Keep the TextInput immediate/responsive while the expensive list filter waits
  // briefly. This is especially important on web/mobile with 10k+ cartons.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 180);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Build searchable text and stable row keys only when carton data changes.
  // The old implementation rebuilt searchable strings repeatedly on every keypress.
  const indexedCartons = useMemo(() =>
    cartons.map((item, index) => ({
      item,
      key: keyOf(item) || `warehouse_row_${index}`,
      search: searchable(item),
    })),
  [cartons]);

  const selectedKeySet = useMemo(
    () => new Set(Object.keys(selected)),
    [selected]
  );

  const selectedOrderRank = useMemo(() => {
    const rank = new Map();
    selectedOrder.forEach((key, index) => rank.set(key, index));
    return rank;
  }, [selectedOrder]);

  const filteredCartons = useMemo(() => {
    const query = debouncedSearchText.trim().toLowerCase();
    const selectedRows = [];
    const remainingRows = [];

    // Single O(n) pass. The previous selectedOrder -> rows.find() approach could
    // become O(n*m) and was very expensive with large carton lists.
    indexedCartons.forEach(entry => {
      if (query && !entry.search.includes(query)) return;

      if (selectedKeySet.has(entry.key)) {
        selectedRows.push(entry);
      } else {
        remainingRows.push(entry);
      }
    });

    selectedRows.sort((a, b) =>
      (selectedOrderRank.get(a.key) ?? Number.MAX_SAFE_INTEGER) -
      (selectedOrderRank.get(b.key) ?? Number.MAX_SAFE_INTEGER)
    );

    return [...selectedRows, ...remainingRows];
  }, [indexedCartons, debouncedSearchText, selectedKeySet, selectedOrderRank]);

  const clearSelected = () => {
    setSelected({});
    setSelectedOrder([]);
  };

  // const loadData = async () => {
  //   if (!toLocation.trim()) {
  //     return AppAlert.alert("Validation", "Please enter/select To Location");
  //   }

  //   try {
  //     setLoading(true);
  //     clearSelected();
  //     setSearchText("");

  //     const payload = {
  //       ...criteria,
  //       mode: "TRANSFER",
  //       fromLocationCode: location.locationCode || "",
  //       fromLocationName: location.locationName || location.location || "",
  //       toLocation,
  //     };

  //     const res = await warehouseApi.loadCartons(payload);
  //     const rows = res?.data?.data || res?.data?.results || [];

  //     setCartons(Array.isArray(rows) ? rows : []);
  //   } catch (e) {
  //     AppAlert.alert(
  //       "Error",
  //       e?.response?.data?.message || "Failed to load cartons"
  //     );
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const loadData = async () => {
    const userPtype = await AsyncStorage.getItem('user_prptype');
    const selectedRows = Object.values(selected);


    try {
      setLoading(true);

      const payload = {
        prpcode: criteria.prpcode,
        strcode: criteria.strcode,
        yearno: getCurrentFinancialYear(),
        itmcode: "",
        txntype: "production_warehouse_locations",
        selectedcartons: [],
        fromlocationdetail: [location],
        tolocationdetail: [],
        action: "view",
        prptype: userPtype
      };

      console.log("assign save payload", payload);

      const res = await axios.post(
        `${API}/api/prodwarehousemanage`,
        payload,
        getRequestConfig()
      );

      console.log("response", res);

      const rows = res?.data?.data || res?.data?.results || [];

      setCartons(Array.isArray(rows) ? rows : []);
    } catch (e) {
      AppAlert.alert(
        "Error",
        e?.response?.data?.message || e?.response?.data?.error ||
        e?.message ||
        "Failed to save assign"
      );
    } finally {
      setLoading(false);
    }
  };

  const locationsearch = async () => {
    const userPtype = await AsyncStorage.getItem('user_prptype');
    const selectedRows = Object.values(selected);


    try {
      setLoading(true);

      const payload = {
        PrpCode: criteria.prpcode,
        StrCode: criteria.strcode,
        YearNo: getCurrentFinancialYear(),
        txntype: "production_warehouse_locations",
        action: "browse_data",
        fetch: "production_warehouse_location_master",
        module: "production_warehouse_location_master"
      };

      console.log("location data payload", payload);

      const res = await axios.post(
        `${API}/api/master_crud`,
        payload,
        getRequestConfig()
      );

      console.log("location data", res);

      const rows =
        res?.data?.data?.prodwarehouselocations ||
        res?.data?.response?.data ||
        res?.data?.data ||
        res?.data?.results ||
        [];
      const filteredRows = Array.isArray(rows)
        ? rows.filter(
          item =>
            String(item.location || "").trim().toLowerCase() !==
            String(location.locationName || location.location || "")
              .trim()
              .toLowerCase()
        )
        : [];

      // SET FILTERED ROWS
      setLocationData(filteredRows);

    } catch (e) {
      AppAlert.alert(
        "Error",
        e?.response?.data?.message || e?.response?.data?.error ||
        e?.message ||
        "Failed to save assign"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    locationsearch()
  }, [])



  const saveTransfer = async () => {
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
        tolocationdetail: [selectedLocation],
        action: "transfer",
      };

      console.log("transfer save payload", payload);

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


  const toggleSelect = item => {
    const key = keyOf(item);

    if (!key) {
      return AppAlert.alert("Validation", "Carton number missing");
    }

    setSelected(prev => {
      const next = { ...prev };

      if (next[key]) {
        delete next[key];

        setSelectedOrder(order => order.filter(x => x !== key));
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

  const openScanner = () => {
  Keyboard.dismiss();

  if (!toLocation.trim()) {
    return AppAlert.alert("Validation", "Please enter/select To Location");
  }

  if (!cartons.length) {
    return AppAlert.alert("Validation", "Please load carton data first");
  }

  navigation.navigate("WarehouseQRScanner", {
    mode: "TRANSFER",
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
        const newKeys = validRows
          .map(row => keyOf(row))
          .filter(Boolean);

        return [
          ...newKeys.reverse(),
          ...prev.filter(x => !newKeys.includes(x)),
        ];
      });
    },
  });
};

  // Mobile camera scanner entry point. Kept separate from the existing
  // hardware-scanner path so scanner timing/matching behavior remains untouched.
  const openCameraScanner = () => {
    Keyboard.dismiss();

    if (!toLocation.trim()) {
      return AppAlert.alert("Validation", "Please enter/select To Location");
    }

    if (!cartons.length) {
      return AppAlert.alert("Validation", "Please load carton data first");
    }

    navigation.navigate("WarehouseQRCameraScanner", {
      mode: "TRANSFER",
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
          const newKeys = validRows
            .map(row => keyOf(row))
            .filter(Boolean);

          return [
            ...newKeys.reverse(),
            ...prev.filter(x => !newKeys.includes(x)),
          ];
        });
      },
    });
  };



  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <>
          <View style={{ flex: 1 }}>
            <WarehouseHeader title="Transfer Carton" navigation={navigation} />

            <View style={[styles.container, { flex: 1, minHeight: 0, paddingBottom: searchFocused ? 10 : 82 }]}>
              <View style={styles.card}>
                <View style={styles.between}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Icon name="place" size={18} color="#0f8f9a" />
                    <Text style={[styles.label, { marginLeft: 6 }]}>
                      From Location
                    </Text>
                  </View>

                  <Text style={{ color: "#000", fontWeight: "900" }}>
                    {location.locationName || location.location}
                  </Text>
                </View>

                <View style={styles.between}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Icon name="stacked-bar-chart" size={18} color="#0f8f9a" />
                    <Text style={[styles.label, { marginLeft: 6 }]}>
                      From Capacity
                    </Text>
                  </View>

                  <Text style={{ color: "#000", fontWeight: "900" }}>
                    {location.used || location.occupancy || 0} / {location.capacity || 0}
                  </Text>
                </View>

                {/* <Text style={styles.label}>
                To Location <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={styles.input}
                value={toLocation}
                onChangeText={setToLocation}
                placeholder="Select Location"
                placeholderTextColor="#9ca3af"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              /> */}

                <Text style={styles.label}>To Location</Text>

                <TouchableOpacity
                  style={styles.bigInput}
                  onPress={() => setLocationPickerVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.inputText,
                      {
                        color: selectedLocation ? "#000" : "#98A2B3",
                      },
                    ]}
                  >
                    {
                      selectedLocation?.location ||
                      'Select Location'
                    }
                  </Text>

                  <Icon
                    name="keyboard-arrow-down"
                    size={22}
                    color="#000"
                  />
                </TouchableOpacity>

                <View style={[styles.between, { marginTop: 10 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Icon name="stacked-bar-chart" size={18} color="#0f8f9a" />
                    <Text style={[styles.label, { marginLeft: 6 }]}>
                      To Capacity
                    </Text>
                  </View>

                  <Text style={{ color: "#000", fontWeight: "900" }}>
                    0 / 0
                  </Text>
                </View>

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
                        <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                          LOAD DATA
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={openScanner}
                    style={{
                      width: 54,
                      height: 54,
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
                    onPress={openCameraScanner}
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#0f8f9a",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#fff",
                      marginLeft: 8,
                    }}
                    accessibilityLabel="Open mobile camera scanner"
                  >
                    <Icon name="photo-camera" size={27} color="#0f8f9a" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.row, { marginBottom: 10 }]}>
                <Icon name="search" size={20} color="#000" />

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

                <TouchableOpacity onPress={clearSelected}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Icon name="delete-sweep" size={16} color="#dc2626" />
                    <Text
                      style={{
                        color: "#dc2626",
                        fontWeight: "800",
                        marginLeft: 4,
                      }}
                    >
                      Clear All
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <FlatList
                style={[{ flex: 1, minHeight: 0 }, Platform.OS === "web" ? ({ overflowY: "auto" } as any) : null]}
                data={filteredCartons}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="none"
                extraData={selected}
                keyExtractor={entry => entry.key}
                initialNumToRender={16}
                maxToRenderPerBatch={20}
                updateCellsBatchingPeriod={50}
                windowSize={7}
                removeClippedSubviews={Platform.OS !== "web"}
                renderItem={({ item: entry }) => (
                  <CartonCard
                    item={entry.item}
                    selected={!!selected[entry.key]}
                    onPress={toggleSelect}
                  />
                )}
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

                <TouchableOpacity style={styles.bottomButton} onPress={saveTransfer}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Icon name="save-alt" size={18} color="#fff" />

                    <Text style={[styles.bottomButtonText, { marginLeft: 8 }]}>
                      SAVE TRANSFER
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>

        <Modal visible={locationPickerVisible} animationType="slide">
          <View style={{ flex: 1, backgroundColor: "#fff" }}>

            {/* HEADER */}
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                onPress={() => {
                  setLocationPickerVisible(false);
                  setLocationSearch("");
                }}
              >
                <Icon
                  name="arrow-back-ios"
                  size={20}
                  color="#000"
                />
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>
                Select Location
              </Text>
              <View style={{ width: 20 }} />
            </View>

            {/* SEARCH */}
            <View style={styles.pickerSearch}>
              <Icon
                name="search"
                size={18}
                color="#000"
              />
              <TextInput
                placeholder="Search location..."
                placeholderTextColor="#000"
                value={locationSearch}
                onChangeText={setLocationSearch}
                style={{ flex: 1 }}
              />
            </View>

            {/* LIST */}
            <FlatList
              data={locationData.filter(p =>
                (p.location || "")
                  .toLowerCase()
                  .includes(locationSearch.toLowerCase())
              )}
              keyExtractor={(item, index) =>
                String(item.location || index)
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {

                    console.log("selected location item", item);

                    // PURA OBJECT SET HOGA
                    setSelectedLocation(item);

                    // LOCATION STRING AGAR ALAG SE CHAHIYE
                    setToLocation(item.location);

                    setLocationPickerVisible(false);
                    setLocationSearch("");
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: "#000",
                        fontWeight: "700",
                        fontSize: 15,
                      }}
                    >
                      {item.location}
                    </Text>

                    <Text
                      style={{
                        color: "#000",
                        marginTop: 2,
                        fontSize: 12,
                      }}
                    >
                     Location Code: {item.locationin}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>
      </>
    </KeyboardAvoidingView>
  );
}