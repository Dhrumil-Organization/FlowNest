import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Camera, useCameraDevice, useCodeScanner } from "react-native-vision-camera";
import { styles, COLORS } from "./components/WarehouseStyles";
import CartonCard from "./components/CartonCard";

const EXPECTED_LENGTH = 14;

const cleanScannerValue = value =>
  String(value || "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .replace(/\t/g, "")
    .trim();

const normalizeCart = value =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/^O(?=\d)/i, "0");

const normalizeScan = value => {
  const cleanValue = cleanScannerValue(value);

  if (!cleanValue) return "";

  if (cleanValue.includes("~")) {
    let parts = cleanValue
      .split("~")
      .map(x => x.trim())
      .filter(Boolean);

    if (parts.length > EXPECTED_LENGTH) {
      const last3 = parts.slice(-3).join("~");
      const prev3 = parts.slice(-6, -3).join("~");

      if (last3 === prev3) {
        parts = parts.slice(0, parts.length - 3);
      }
    }

    if (parts.length > EXPECTED_LENGTH) {
      parts = parts.slice(0, EXPECTED_LENGTH);
    }

    return parts
      .map(val => {
        const num = Number(val);
        return Number.isNaN(num) ? val : num.toString();
      })
      .join("~");
  }

  if (cleanValue.includes(",")) {
    return cleanValue
      .replace(/^"+|"+$/g, "")
      .split(",")
      .map(x => x.replace(/^"+|"+$/g, "").trim())
      .map(val => {
        const num = Number(val);
        return Number.isNaN(num) ? val : num.toString();
      })
      .join(",");
  }

  return cleanValue;
};

const getCartonKey = item =>
  normalizeCart(item?.uid || item?.cartonNo || item?.cartno || item?.CartNo || item?.carton_no);

export default function WarehouseQRScanner({ navigation, route }) {
  const {
    mode = "ASSIGN",
    cartons = [],
    selected = {},
    onScanResult,
  } = route.params || {};

  const [scanned, setScanned] = useState(selected || {});
  const [lastMessage, setLastMessage] = useState("");
  const processingRef = useRef(false);

  const device = useCameraDevice("back");

  const scanMap = useMemo(() => {
    const map = new Map();

    cartons.forEach(row => {
      if (row.scancode) {
        map.set(normalizeScan(row.scancode), row);
      }

      if (row.scancode1) {
        map.set(normalizeScan(row.scancode1), row);
      }
    });

    return map;
  }, [cartons]);

  const selectedCartSet = useMemo(() => {
    const set = new Set();

    Object.values(scanned || {}).forEach(row => {
      const key = getCartonKey(row);
      if (key) set.add(key);
    });

    return set;
  }, [scanned]);

  const markSelected = row => {
    const cartKey = getCartonKey(row);
    const displayCarton = row?.cartno || row?.cartonNo || row?.CartNo || cartKey;

    if (!cartKey) {
      Alert.alert("Invalid Carton", "Carton number missing");
      return;
    }

    if (selectedCartSet.has(cartKey)) {
      setLastMessage(`Duplicate: ${displayCarton}`);
      Alert.alert("Duplicate Carton", `Carton ${displayCarton} already scanned`);
      return;
    }

    setScanned(prev => ({
      ...prev,
      [cartKey]: row,
    }));

    onScanResult?.(row);
    setLastMessage(`Scanned: ${displayCarton}`);
  };

  const processScan = value => {
    const rawInput = cleanScannerValue(value);

    if (!rawInput) return;

    const normalizedInput = normalizeScan(rawInput);

    if (!normalizedInput) {
      Alert.alert("Invalid Scan", "Blank scan received");
      return;
    }

    let matchingRow = scanMap.get(normalizedInput);

    if (matchingRow) {
      markSelected(matchingRow);
      return;
    }

    const separator = normalizedInput.includes("~") ? "~" : ",";

    if (separator !== "~") {
      setLastMessage("No Match");
      Alert.alert("No Match", "Carton not found");
      return;
    }

    const parts = normalizedInput
      .split("~")
      .map(x => x.trim())
      .filter(Boolean);

    if (parts.length !== EXPECTED_LENGTH) {
      Alert.alert(
        "Invalid Scan",
        `Expected ${EXPECTED_LENGTH} fields but received ${parts.length}`
      );
      return;
    }

    const [
      ItmCode,
      MerCode,
      GrdCode,
      ShdCode,
      Denier,
      ProdType,
      CartNo,
      _field8,
      _field9,
      Qty,
    ] = parts;

    matchingRow = cartons.find(row => {
      return (
        String(row.ItmCode || row.itmCode || "") === String(ItmCode || "") &&
        String(row.MerCode || row.merCode || "") === String(MerCode || "") &&
        String(row.GrdCode || row.grdCode || "") === String(GrdCode || "") &&
        String(row.ShdCode || row.shdCode || "") === String(ShdCode || "") &&
        String(row.denier || row.Denier || "") === String(Denier || "") &&
        String(row.ProdType || row.prodType || "") === String(ProdType || "") &&
        Math.abs(Number(row.qty || row.Qty || 0) - Number(Qty || 0)) < 0.0001
      );
    });

    if (!matchingRow) {
      setLastMessage("No Match");
      Alert.alert("No Match", "Item not found in loaded carton list");
      return;
    }

    if (
      normalizeCart(matchingRow.cartno || matchingRow.cartonNo || matchingRow.CartNo) !==
      normalizeCart(CartNo)
    ) {
      Alert.alert(
        "Cart mismatch",
        `Scanned: ${CartNo}, Expected: ${matchingRow.cartno || matchingRow.cartonNo || matchingRow.CartNo}`
      );
      return;
    }

    markSelected(matchingRow);
  };

  const codeScanner = useCodeScanner({
    codeTypes: ["qr", "ean-13", "code-128"],
    onCodeScanned: codes => {
      if (processingRef.current) return;

      const value = codes?.[0]?.value;

      if (!value) return;

      processingRef.current = true;
      processScan(value);

      setTimeout(() => {
        processingRef.current = false;
      }, 900);
    },
  });

  const scannedRows = Object.values(scanned || {});

  if (!device) {
    return (
      <View style={styles.screen}>
        <View style={styles.container}>
          <Text style={{ color: COLORS.muted, textAlign: "center", marginTop: 40 }}>
            Camera not available
          </Text>

          <TouchableOpacity
            style={[styles.button, { marginTop: 20 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>CLOSE SCANNER</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.container, { paddingBottom: 80 }]}>
        <View style={styles.card}>
          <View style={styles.between}>
            <View>
              <Text style={{ fontWeight: "900", color: COLORS.primary }}>
                {mode === "TRANSFER" ? "Transfer QR Scan" : "Assign QR Scan"}
              </Text>
              <Text style={{ color: COLORS.muted, fontSize: 12 }}>
                Keep scanning cartons. Tap Close Scanner when done.
              </Text>
            </View>

            <Icon name="qrcode-scan" size={28} color={COLORS.primary} />
          </View>

          {!!lastMessage && (
            <Text style={{ color: COLORS.primary, fontWeight: "800", marginTop: 8 }}>
              {lastMessage}
            </Text>
          )}
        </View>

        <View
          style={{
            height: 280,
            borderRadius: 14,
            overflow: "hidden",
            marginBottom: 12,
            backgroundColor: "#000",
          }}
        >
          <Camera
            style={{ flex: 1 }}
            device={device}
            isActive={true}
            codeScanner={codeScanner}
          />
        </View>

        <Text style={{ fontWeight: "900", marginBottom: 8 }}>
          Scanned Cartons ({scannedRows.length})
        </Text>

        <FlatList
          data={scannedRows}
          keyExtractor={(item, index) => String(getCartonKey(item) || index)}
          renderItem={({ item }) => (
            <CartonCard item={item} selected={true} onPress={() => {}} />
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: COLORS.muted, marginTop: 40 }}>
              No cartons scanned
            </Text>
          }
        />
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>Selected: {scannedRows.length}</Text>

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.bottomButtonText}>CLOSE SCANNER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}