import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { warehouseApi } from "../../services/warehouseApi";
import CartonCard from "./components/CartonCard";
import { styles, COLORS } from "./components/WarehouseStyles";

const getCartonKey = item =>
  String(item?.uid || item?.cartonNo || item?.cartno || item?.CartNo || "");

const getSearchText = item => `
  ${item?.cartno || ""}
  ${item?.cartonNo || ""}
  ${item?.ItmName || ""}
  ${item?.itemName || ""}
  ${item?.ShdName || ""}
  ${item?.shadeName || ""}
  ${item?.GrdName || ""}
  ${item?.gradeName || ""}
  ${item?.MerName || ""}
  ${item?.vouno || ""}
  ${item?.scancode || ""}
  ${item?.scancode1 || ""}
`.toLowerCase();

export default function WarehouseAssignScreen({ navigation, route }) {
  const { criteria = {}, location = {} } = route.params || {};

  const [itemText, setItemText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [cartons, setCartons] = useState([]);
  const [selected, setSelected] = useState({});

  const selectedCount = Object.keys(selected).length;

  const filteredCartons = useMemo(() => {
    const s = searchText.trim().toLowerCase();

    if (!s) return cartons;

    return cartons.filter(item => getSearchText(item).includes(s));
  }, [cartons, searchText]);

  const loadData = async () => {
    if (!location?.locationCode && !location?.locationName) {
      Alert.alert("Validation", "Location is required");
      return;
    }

    try {
      setLoading(true);
      setSelected({});
      setSearchText("");

      const payload = {
        ...criteria,
        mode: "ASSIGN",
        locationCode: location.locationCode,
        locationName: location.locationName,
        itemText,
      };

      const res = await warehouseApi.loadCartons(payload);
      const rows = res?.data?.data || res?.data?.results || [];

      setCartons(Array.isArray(rows) ? rows : []);
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to load cartons");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = item => {
    const key = getCartonKey(item);

    if (!key) {
      Alert.alert("Validation", "Carton number missing");
      return;
    }

    setSelected(prev => {
      const next = { ...prev };

      if (next[key]) delete next[key];
      else next[key] = item;

      return next;
    });
  };

  const openScanner = () => {
    if (!cartons.length) {
      Alert.alert("Validation", "Please load carton data first");
      return;
    }

    navigation.navigate("WarehouseQRScanner", {
      mode: "ASSIGN",
      cartons,
      selected,
      onScanResult: scannedCarton => {
        const key = getCartonKey(scannedCarton);

        if (!key) return;

        setSelected(prev => ({
          ...prev,
          [key]: scannedCarton,
        }));
      },
    });
  };

  const saveAssign = async () => {
    const selectedRows = Object.values(selected);

    if (selectedRows.length === 0) {
      Alert.alert("Validation", "Please select at least one carton");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...criteria,
        locationCode: location.locationCode,
        locationName: location.locationName,
        cartons: selectedRows,
      };

      const res = await warehouseApi.saveAssign(payload);

      Alert.alert("Success", res?.data?.message || "Assign saved successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to save assign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.container, { paddingBottom: 80 }]}>
        <View style={styles.card}>
          <View style={styles.between}>
            <Text style={styles.label}>Location</Text>
            <Text style={{ color: COLORS.primary, fontWeight: "900" }}>
              {location.locationName}
            </Text>
          </View>

          <View style={styles.between}>
            <Text style={styles.label}>Capacity</Text>
            <Text style={{ color: COLORS.primary, fontWeight: "900" }}>
              {location.used || 0} / {location.capacity || 0}
            </Text>
          </View>

          <Text style={styles.label}>Item Name *</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={itemText}
              onChangeText={setItemText}
              placeholder="Search/select item"
            />
            <TouchableOpacity style={{ marginLeft: 8 }}>
              <Icon name="qrcode-scan" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={loadData}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>LOAD DATA</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { marginTop: 14, alignItems: "center" }]}
            onPress={openScanner}
          >
            <Icon name="qrcode-scan" size={30} color={COLORS.primary} />
            <Text style={{ fontWeight: "900", color: COLORS.primary }}>
              SCAN CARTON QR
            </Text>
            <Text style={{ color: COLORS.muted, fontSize: 12 }}>
              Camera scanner stays open for continuous scan
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, { marginBottom: 10 }]}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Manual search carton / item / shade / voucher"
        />

        <View style={styles.between}>
          <Text style={{ fontWeight: "900" }}>
            Carton List ({filteredCartons.length}/{cartons.length})
          </Text>
          <TouchableOpacity onPress={() => setSelected({})}>
            <Text style={{ color: COLORS.primary, fontWeight: "800" }}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredCartons}
          keyExtractor={(item, index) => String(getCartonKey(item) || index)}
          renderItem={({ item }) => {
            const key = getCartonKey(item);

            return (
              <CartonCard
                item={item}
                selected={!!selected[key]}
                onPress={toggleSelect}
              />
            );
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: COLORS.muted, marginTop: 40 }}>
              No cartons available
            </Text>
          }
        />
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>Selected: {selectedCount}</Text>

        <TouchableOpacity style={styles.bottomButton} onPress={saveAssign}>
          <Text style={styles.bottomButtonText}>SAVE ASSIGN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}