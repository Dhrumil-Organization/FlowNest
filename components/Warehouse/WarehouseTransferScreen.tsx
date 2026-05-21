import React, { useState } from "react";
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
import { warehouseApi } from "./services/warehouseApi";
import CartonCard from "./components/CartonCard";
import { styles, COLORS } from "./components/WarehouseStyles";

export default function WarehouseTransferScreen({ navigation, route }) {
  const { criteria = {}, location = {} } = route.params || {};

  const [toLocation, setToLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [cartons, setCartons] = useState([]);
  const [selected, setSelected] = useState({});

  const selectedCount = Object.keys(selected).length;

  const loadData = async () => {
    if (!toLocation.trim()) {
      Alert.alert("Validation", "Please enter/select To Location");
      return;
    }

    try {
      setLoading(true);
      setSelected({});

      const payload = {
        ...criteria,
        mode: "TRANSFER",
        fromLocationCode: location.locationCode,
        fromLocationName: location.locationName,
        toLocation,
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
    const key = String(item.uid || item.cartonNo);

    setSelected(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = item;
      return next;
    });
  };

  const openScanner = () => {
    navigation.navigate("WarehouseQRScanner", {
      mode: "TRANSFER",
      cartons,
      selected,
      onScanResult: scannedCarton => {
        const key = String(scannedCarton.uid || scannedCarton.cartonNo);
        setSelected(prev => ({
          ...prev,
          [key]: scannedCarton,
        }));
      },
    });
  };

  const saveTransfer = async () => {
    const selectedRows = Object.values(selected);

    if (!toLocation.trim()) {
      Alert.alert("Validation", "To Location is required");
      return;
    }

    if (selectedRows.length === 0) {
      Alert.alert("Validation", "Please select at least one carton");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...criteria,
        fromLocationCode: location.locationCode,
        fromLocationName: location.locationName,
        toLocation,
        cartons: selectedRows,
      };

      const res = await warehouseApi.saveTransfer(payload);

      Alert.alert("Success", res?.data?.message || "Transfer saved successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to save transfer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.container, { paddingBottom: 80 }]}>
        <View style={styles.card}>
          <View style={styles.between}>
            <Text style={styles.label}>From Location *</Text>
            <Text style={{ color: COLORS.primary, fontWeight: "900" }}>
              {location.locationName}
            </Text>
          </View>

          <View style={styles.between}>
            <Text style={styles.label}>From Capacity *</Text>
            <Text style={{ color: COLORS.primary, fontWeight: "900" }}>
              {location.used || 0} / {location.capacity || 0}
            </Text>
          </View>

          <Text style={styles.label}>To Location *</Text>
          <TextInput
            style={styles.input}
            value={toLocation}
            onChangeText={setToLocation}
            placeholder="Select Location"
          />

          <View style={styles.between}>
            <Text style={styles.label}>To Capacity</Text>
            <Text style={{ color: COLORS.primary, fontWeight: "900" }}>0 / 0</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={loadData}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>LOAD DATA</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { marginTop: 14, alignItems: "center" }]}
            onPress={openScanner}
          >
            <Icon name="qrcode-scan" size={30} color={COLORS.primary} />
            <Text style={{ fontWeight: "900", color: COLORS.primary }}>SCAN CARTON QR</Text>
            <Text style={{ color: COLORS.muted, fontSize: 12 }}>Tap to scan carton barcode</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.between}>
          <Text style={{ fontWeight: "900" }}>Carton List ({cartons.length})</Text>
          <TouchableOpacity onPress={() => setSelected({})}>
            <Text style={{ color: COLORS.primary, fontWeight: "800" }}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={cartons}
          keyExtractor={(item, index) => String(item.uid || item.cartonNo || index)}
          renderItem={({ item }) => {
            const key = String(item.uid || item.cartonNo);
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

        <TouchableOpacity style={styles.bottomButton} onPress={saveTransfer}>
          <Text style={styles.bottomButtonText}>SAVE TRANSFER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}