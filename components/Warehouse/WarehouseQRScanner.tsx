import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  FlatList,
  Animated,
  Easing,
  StyleSheet,
  // SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from "react-native-vision-camera";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const EXPECTED_LENGTH = 14;
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const BOTTOM_SHEET_HEIGHT = Math.min(300, Math.round(SCREEN_HEIGHT * 0.32));
const SCAN_SIZE = Math.min(285, Math.round(SCREEN_WIDTH * 0.72));

const cleanScannerValue = value =>
  String(value || "").replace(/\r/g, "").replace(/\n/g, "").replace(/\t/g, "").trim();

const normalizeNumberText = val => {
  const s = String(val || "").trim();
  if (s === "") return "";
  const num = Number(s);
  return Number.isNaN(num) ? s : num.toString();
};

const parseCsvScan = value =>
  String(value || "")
    .replace(/\\"/g, '"')
    .replace(/\\+/g, "")
    .replace(/^"+|"+$/g, "")
    .split(",")
    .map(x => x.replace(/^"+|"+$/g, "").trim())
    .filter(x => x !== "")
    .map(normalizeNumberText)
    .join(",");

const normalizeScan = value => {
  const cleanValue = cleanScannerValue(value);
  if (!cleanValue) return "";

  if (cleanValue.includes("~")) {
    let parts = cleanValue.split("~").map(x => x.trim()).filter(Boolean);

    if (parts.length > EXPECTED_LENGTH) {
      const last3 = parts.slice(-3).join("~");
      const prev3 = parts.slice(-6, -3).join("~");
      if (last3 === prev3) parts = parts.slice(0, parts.length - 3);
    }

    if (parts.length > EXPECTED_LENGTH) parts = parts.slice(0, EXPECTED_LENGTH);

    return parts.map(normalizeNumberText).join("~");
  }

  if (cleanValue.includes(",")) return parseCsvScan(cleanValue);

  return cleanValue;
};

const normalizeCart = value =>
  String(value || "").trim().replace(/\s+/g, "").replace(/^O(?=\d)/i, "0");

const getCartonKey = item =>
  normalizeCart(
    item?.uid ||
    item?.UId ||
    item?.cartonNo ||
    item?.cartno ||
    item?.CartNo ||
    ""
  );

const getCartonName = item =>
  item?.cartonNo || item?.cartno || item?.CartNo || item?.uid || item?.UId || "";

export default function WarehouseQRScanner({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const { mode = "ASSIGN", cartons = [], selected = {}, onScanResult } = route.params || {};

  const [hasPermission, setHasPermission] = useState(false);
  const [scanned, setScanned] = useState(selected || {});
  const [torch, setTorch] = useState("off");
  const [status, setStatus] = useState({
    type: "ready",
    title: "Ready to Scan",
    message: "Align carton QR inside the frame",
  });

  const processingRef = useRef(false);
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const device = useCameraDevice("back");

  useEffect(() => {
    const requestPermission = async () => {
      const permission = await Camera.requestCameraPermission();

      if (permission !== "granted") {
        Alert.alert("Camera Permission Required", "Please allow camera permission.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        return;
      }

      setHasPermission(true);
    };

    requestPermission();
  }, [navigation]);

  const scanMap = useMemo(() => {
    const map = new Map();

    cartons.forEach(row => {
      if (row.scancode) map.set(normalizeScan(row.scancode), row);

      if (row.scancode1) {
        map.set(normalizeScan(row.scancode1), row);
        map.set(normalizeScan(String(row.scancode1).replace(/\\"/g, '"')), row);
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

  const scannedRows = useMemo(() => Object.values(scanned || {}).reverse(), [scanned]);

  const playStatusAnimation = type => {
    scaleAnim.setValue(0.7);
    opacityAnim.setValue(0);

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      setStatus({
        type: "ready",
        title: "Ready for Next Scan",
        message: "Scan another carton QR",
      });
    }, type === "success" ? 1800 : 2200);
  };

  const setScanStatus = (type, title, message) => {
    setStatus({ type, title, message });
    playStatusAnimation(type);
  };

  const markSelected = row => {
    const cartKey = getCartonKey(row);
    const displayCarton = getCartonName(row) || cartKey;

    if (!cartKey) {
      setScanStatus("error", "Invalid Carton", "Carton number missing");
      return false;
    }

    if (selectedCartSet.has(cartKey)) {
      setScanStatus("duplicate", "Already Scanned", `Carton ${displayCarton} already selected`);
      return false;
    }

    setScanned(prev => ({ ...prev, [cartKey]: row }));
    onScanResult?.(row);

    setScanStatus("success", "Scan Successful!", `Carton ${displayCarton} added`);
    return true;
  };

  const processScan = value => {
    const rawInput = cleanScannerValue(value);
    if (!rawInput) return;

    const normalizedInput = normalizeScan(rawInput);
    if (!normalizedInput) {
      setScanStatus("error", "Invalid Scan", "Blank QR received");
      return;
    }

    let matchingRow = scanMap.get(normalizedInput);

    if (matchingRow) {
      markSelected(matchingRow);
      return;
    }

    const separator = normalizedInput.includes("~") ? "~" : ",";

    if (separator !== "~") {
      setScanStatus("error", "No Match", "Carton not found in loaded list");
      return;
    }

    const parts = normalizedInput.split("~").map(x => x.trim()).filter(Boolean);

    if (parts.length !== EXPECTED_LENGTH) {
      setScanStatus("error", "Invalid QR", `Expected ${EXPECTED_LENGTH} fields, received ${parts.length}`);
      return;
    }

    const [ItmCode, MerCode, GrdCode, ShdCode, Denier, ProdType, CartNo, , , Qty] = parts;

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
      setScanStatus("error", "No Match", "Item not found in loaded carton list");
      return;
    }

    if (normalizeCart(getCartonName(matchingRow)) !== normalizeCart(CartNo)) {
      setScanStatus("error", "Cart Mismatch", `Scanned ${CartNo}, expected ${getCartonName(matchingRow)}`);
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
      }, 1800);
    },
  });

  const statusIcon =
    status.type === "success"
      ? "check-circle"
      : status.type === "duplicate"
        ? "error"
        : status.type === "error"
          ? "cancel"
          : "qr-code-scanner";

  const statusColor =
    status.type === "success"
      ? "#22c55e"
      : status.type === "duplicate"
        ? "#f59e0b"
        : status.type === "error"
          ? "#ef4444"
          : "#0f8f9a";

  if (!hasPermission) {
    return (
      <View style={screenStyles.centerBlack}>
        <Text style={screenStyles.whiteBold}>Waiting for camera permission...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={screenStyles.centerBlack}>
        <Text style={screenStyles.whiteBold}>Camera not available</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={screenStyles.closeButton}>
          <Text style={screenStyles.closeButtonText}>CLOSE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={screenStyles.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <Camera
        style={screenStyles.fullCamera}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
        torch={torch}
      />

      <View style={screenStyles.darkOverlay} />

      <SafeAreaView style={screenStyles.safeTop} edges={['top', 'left', 'right']}>
        <View style={screenStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={screenStyles.iconCircle}>
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <Text style={screenStyles.headerTitle}>
            {mode === "TRANSFER" ? "Transfer Scan" : "Assign Scan"}
          </Text>

          <TouchableOpacity
            onPress={() => setTorch(prev => (prev === "on" ? "off" : "on"))}
            style={screenStyles.iconCircle}
          >
            <Icon name={torch === "on" ? "flash-off" : "flash-on"} size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={screenStyles.scanCenter}>
        <Text style={screenStyles.scanHint}>Scan Carton QR Code</Text>

        <View style={screenStyles.scanBox}>
          <View style={screenStyles.cornerTL} />
          <View style={screenStyles.cornerTR} />
          <View style={screenStyles.cornerBL} />
          <View style={screenStyles.cornerBR} />
        </View>
      </View>

      {status.type !== "ready" && (
        <Animated.View
          style={[
            screenStyles.statusCard,
            {
              borderColor: statusColor,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Icon name={statusIcon} size={52} color={statusColor} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={screenStyles.statusTitle}>{status.title}</Text>
            <Text style={screenStyles.statusMessage}>{status.message}</Text>
          </View>
        </Animated.View>
      )}

      <View style={screenStyles.bottomSheet}>
        <View style={screenStyles.bottomTopRow}>
          <View>
            <Text style={screenStyles.bottomTitle}>
              Scanned Cartons ({scannedRows.length})
            </Text>
            <Text style={screenStyles.bottomSubTitle}>
              {scannedRows.length} carton(s) selected
            </Text>
          </View>

          {scannedRows.length > 0 && (
            <TouchableOpacity onPress={() => setScanned({})}>
              <Text style={screenStyles.clearText}>CLEAR ALL</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={scannedRows}
          keyExtractor={(item, index) => String(getCartonKey(item) || index)}
          style={screenStyles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <View style={screenStyles.cartRow}>
              <View style={screenStyles.serialBadge}>
                <Text style={screenStyles.serialText}>{index + 1}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={screenStyles.cartTitle}>{getCartonName(item)}</Text>
                <Text style={screenStyles.cartLine}>
                  {item?.TranName || item?.tranname || "Packing"} |{" "}
                  {item?.vouno || item?.VouNo || "-"}
                </Text>
                <Text style={screenStyles.cartLine}>
                  {item?.ItmName || item?.itmname || ""}{" "}
                  {item?.GrdName ? `| Grade: ${item.GrdName}` : ""}
                </Text>
              </View>

              <Icon name="more-vert" size={24} color="#64748b" />
            </View>
          )}
          ListEmptyComponent={
            <Text style={screenStyles.emptyText}>No cartons scanned yet</Text>
          }
        />

        <SafeAreaView>
          <TouchableOpacity onPress={() => navigation.goBack()} style={screenStyles.doneButton}>
            <Text style={screenStyles.doneButtonText}>DONE</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
}

const screenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },

  fullCamera: {
    ...StyleSheet.absoluteFillObject,
  },

  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.30)",
  },

  centerBlack: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
  },

  whiteBold: {
    color: "#fff",
    fontWeight: "900",
  },

  safeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900",
  },

  scanCenter: {
    position: "absolute",
    top: 118,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },

  scanHint: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 18,
  },

  scanBox: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.035)",
  },

  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 62,
    height: 62,
    borderTopWidth: 7,
    borderLeftWidth: 7,
    borderColor: "#00d4ff",
    borderTopLeftRadius: 34,
  },

  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 62,
    height: 62,
    borderTopWidth: 7,
    borderRightWidth: 7,
    borderColor: "#00d4ff",
    borderTopRightRadius: 34,
  },

  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 62,
    height: 62,
    borderBottomWidth: 7,
    borderLeftWidth: 7,
    borderColor: "#00d4ff",
    borderBottomLeftRadius: 34,
  },

  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 62,
    height: 62,
    borderBottomWidth: 7,
    borderRightWidth: 7,
    borderColor: "#00d4ff",
    borderBottomRightRadius: 34,
  },

  statusCard: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: BOTTOM_SHEET_HEIGHT + 16,
    minHeight: 82,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.82)",
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 25,
  },

  statusTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
  },

  statusMessage: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: "#e5e7eb",
  },

  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    zIndex: 20,
  },

  bottomTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  bottomTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  bottomSubTitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },

  clearText: {
    color: "#0f8f9a",
    fontSize: 13,
    fontWeight: "900",
    paddingTop: 4,
  },

  list: {
    flex: 1,
  },

  cartRow: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  serialBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0f8f9a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  serialText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },

  cartTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
  },

  cartLine: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },

  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "800",
  },

  doneButton: {
    height: 54,
    borderRadius: 17,
    backgroundColor: "#0f8f9a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },

  closeButton: {
    marginTop: 20,
    height: 50,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: "#0f8f9a",
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
});