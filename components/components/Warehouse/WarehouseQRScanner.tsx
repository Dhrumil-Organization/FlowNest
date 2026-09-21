import AppAlert from '@/common/utils/appAlert';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  Animated,
  Easing,
  StyleSheet,
  StatusBar,
  Dimensions,
} from "react-native";
import Icon from "@expo/vector-icons/MaterialIcons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useUrovoScanner } from "./components/useUrovoScanner";
// import { parseWarehouseQrIdentity, isSameWarehouseCart } from "./utils/warehouseQrMatcher";
import { parseWarehouseQrIdentity, isSameWarehouseCart } from '@/common/utils/warehouseQrMatcher';

const EXPECTED_LENGTH = 14;
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const BOTTOM_SHEET_HEIGHT = Math.min(300, Math.round(SCREEN_HEIGHT * 0.32));
const SCAN_SIZE = Math.min(285, Math.round(SCREEN_WIDTH * 0.72));

const cleanScannerValue = value =>
  String(value || "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .replace(/\t/g, "")
    .trim();

const normalizeNumberText = val => {
  const s = String(val ?? "").trim();
  if (s === "") return "";

  const num = Number(s);
  if (Number.isNaN(num)) return s.toUpperCase();

  return num.toString();
};

const splitScanParts = value => {
  let cleanValue = cleanScannerValue(value);

  if (!cleanValue) return [];

  console.log("cleanScannerValue", cleanScannerValue);

  cleanValue = cleanValue
    .replace(/\\"/g, '"')
    .replace(/\\+/g, "")
    .replace(/^\s*"+|"+\s*$/g, "")
    .replace(/^\s*\{|\}\s*$/g, "")
    .trim();

  const separator = cleanValue.includes("~") ? "~" : ",";

  return cleanValue
    .split(separator)
    .map(x =>
      String(x || "")
        .replace(/^"+|"+$/g, "")
        .replace(/^\{|\}$/g, "")
        .trim()
    )
    .filter(x => x !== "")
    .map(normalizeNumberText);
};

const normalizeScan = value => {
  const parts = splitScanParts(value);
  if (!parts.length) return "";

  console.log("parts", parts);

  const raw = cleanScannerValue(value);

  console.log("raw", raw);

  if (raw.includes("~")) {
    let finalParts = parts;

    if (finalParts.length > EXPECTED_LENGTH) {
      const last3 = finalParts.slice(-3).join("~");
      const prev3 = finalParts.slice(-6, -3).join("~");

      if (last3 === prev3) {
        finalParts = finalParts.slice(0, finalParts.length - 3);
      }
    }

    console.log("finalParts.length", finalParts.length);
    console.log("finalParts", finalParts);

    if (finalParts.length > EXPECTED_LENGTH) {
      finalParts = finalParts.slice(0, EXPECTED_LENGTH);
    }

    return finalParts.join("~");
  }

  return parts.join(",");
};

const normalizeCart = value =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

const sameCart = (a, b) => {
  const c1 = normalizeCart(a);
  const c2 = normalizeCart(b);

  if (!c1 || !c2) return false;
  if (c1 === c2) return true;

  return c1 === `O${c2}` || c2 === `O${c1}`;
};

const getCartonKey = item =>
  normalizeCart(
    item?.cartonNo ||
    item?.cartno ||
    item?.CartNo ||
    item?.carcode ||
    item?.CarCode ||
    item?.cartno1 ||
    item?.CartNo1 ||
    item?.uid ||
    item?.UId ||
    ""
  );

const getStockRowKey = item => {
  const uid = item?.ZUId ?? item?.zuid ?? item?.ZUID ?? item?.UId ?? item?.uid;
  const srNo = item?.ZSrNo ?? item?.zsrno ?? item?.ZSRNO ?? item?.SrNo ?? item?.srno;
  const subSr = item?.ZSubSr ?? item?.zsubsr ?? item?.ZSUBSR ?? item?.SubSr ?? item?.subsr;
  if (uid !== undefined && uid !== null && uid !== "" && srNo !== undefined && srNo !== null && srNo !== "" && subSr !== undefined && subSr !== null && subSr !== "") {
    return `${String(uid).trim()}|${String(srNo).trim()}|${String(subSr).trim()}`;
  }
  return getCartonKey(item);
};

console.log("normalizeCart", normalizeCart);

const getCartonName = item =>
  item?.cartonNo ||
  item?.cartno ||
  item?.CartNo ||
  item?.carcode ||
  item?.CarCode ||
  item?.uid ||
  item?.UId ||
  "";

const same = (a, b) => String(a || "") === String(b || "");

const isCsvToCsvMatch = (apiParts, qrParts) => {
  if (apiParts.length < 16 || qrParts.length < 16) return false;

  return (
    same(apiParts[0], qrParts[0]) &&
    same(apiParts[2], qrParts[2]) &&
    same(apiParts[3], qrParts[3]) &&
    same(apiParts[4], qrParts[4]) &&
    same(apiParts[6], qrParts[6]) &&
    same(apiParts[8], qrParts[8]) &&
    same(apiParts[9], qrParts[9]) &&
    same(apiParts[11], qrParts[11]) &&
    sameCart(apiParts[15], qrParts[15])
  );
};

const isOldToCsvMatch = (oldParts, qrParts) => {
  if (oldParts.length < 14 || qrParts.length < 16) return false;

  return (
    same(oldParts[0], qrParts[0]) &&
    same(oldParts[1], qrParts[6]) &&
    same(oldParts[3], qrParts[2]) &&
    same(oldParts[4], qrParts[8]) &&
    same(oldParts[5], qrParts[11]) &&
    sameCart(oldParts[6], qrParts[15]) &&
    same(oldParts[10], qrParts[14]) &&
    same(oldParts[11], qrParts[9])
  );
};

const isOldToOldMatch = (a, b) => {
  if (a.length < 14 || b.length < 14) return false;

  return (
    same(a[0], b[0]) &&
    same(a[1], b[1]) &&
    same(a[3], b[3]) &&
    same(a[4], b[4]) &&
    same(a[5], b[5]) &&
    sameCart(a[6], b[6]) &&
    same(a[10], b[10]) &&
    same(a[11], b[11])
  );
};

export default function WarehouseQRScanner({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const {
    mode = "ASSIGN",
    cartons = [],
    selected = {},
    onScanResult,
  } = route.params || {};

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

  const [lastRawScan, setLastRawScan] = useState("");
  const [scannerMessage, setScannerMessage] = useState("Ready: press orange trigger button");



  // useEffect(() => {
  //   const requestPermission = async () => {
  //     const permission = await Camera.requestCameraPermission();

  //     if (permission !== "granted") {
  //       AppAlert.alert("Camera Permission Required", "Please allow camera permission.", [
  //         { text: "OK", onPress: () => navigation.goBack() },
  //       ]);
  //       return;
  //     }

  //     setHasPermission(true);
  //   };

  //   requestPermission();
  // }, [navigation]);
  useEffect(() => {
    setHasPermission(true);
  }, []);

  // Precompute stable QR identities once when the loaded stock changes.
  // Physical scans use this index and never walk the complete carton list.
  const qrIdentityIndex = useMemo(() => {
    const map = new Map();
    const add = (row, qrValue) => {
      const identity = parseWarehouseQrIdentity(qrValue);
      if (!identity) return;
      const key = `${identity.itmcode}|${identity.mercode}|${identity.grdcode}|${identity.shdcode}`;
      const list = map.get(key) || [];
      list.push({ row, qrCartNo: identity.cartno });
      map.set(key, list);
    };
    cartons.forEach(row => {
      if (row.scancode) add(row, row.scancode);
      if (row.scancode1) add(row, row.scancode1);
    });
    return map;
  }, [cartons]);

  const selectedCartSet = useMemo(() => {
    const set = new Set();

    Object.values(scanned || {}).forEach(row => {
      const key = getStockRowKey(row);
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
    const stockRowKey = getStockRowKey(row);
    const displayCarton = getCartonName(row) || cartKey;
    if (!cartKey || !stockRowKey) {
      setScanStatus("error", "Invalid Carton", "Carton/stock identity missing");
      return false;
    }
    if (selectedCartSet.has(stockRowKey)) {
      setScanStatus("duplicate", "Already Scanned", `Carton ${displayCarton} already selected`);
      return false;
    }
    setScanned(prev => ({
      ...prev,
      [stockRowKey]: { ...row, _scanCartonKey: cartKey, _scanStockRowKey: stockRowKey },
    }));
    setScanStatus("success", "Scan Successful!", `Carton ${displayCarton} added`);
    return true;
  };

  const processScan = value => {
    const rawInput = cleanScannerValue(value);
    if (!rawInput) return;

    // Parse the scanned QR once. Only stable business identity participates.
    const scannedIdentity = parseWarehouseQrIdentity(rawInput);
    if (!scannedIdentity) {
      setScanStatus("error", "Invalid QR", "Unable to read QR data");
      return;
    }

    const identityKey = `${scannedIdentity.itmcode}|${scannedIdentity.mercode}|${scannedIdentity.grdcode}|${scannedIdentity.shdcode}`;
    const candidates = qrIdentityIndex.get(identityKey) || [];
    const exactRows = new Map();
    const fallbackRows = new Map();
    const scannedCartNo = normalizeCart(scannedIdentity.cartno);

    candidates.forEach(({ row, qrCartNo }) => {
      const stockCartNo = normalizeCart(row?.cartonNo ?? row?.cartno ?? row?.CartNo ?? row?.cartno1 ?? row?.CartNo1 ?? qrCartNo);
      const stockRowKey = getStockRowKey(row);
      if (!stockRowKey || !stockCartNo || !scannedCartNo) return;
      if (stockCartNo === scannedCartNo) exactRows.set(stockRowKey, row);
      else if (isSameWarehouseCart(stockCartNo, scannedCartNo)) fallbackRows.set(stockRowKey, row);
    });

    // Exact carton wins; O-prefix equivalence is fallback only.
    const matches = exactRows.size > 0 ? exactRows : fallbackRows;
    if (matches.size > 1) {
      setScanStatus("error", "Multiple Stock Matches", "QR matches more than one stock row. Please verify the carton.");
      return;
    }
    const matchingRow = matches.size === 1 ? Array.from(matches.values())[0] : null;
    if (!matchingRow) {
      setScanStatus("error", "No Match", "Carton not found in loaded list");
      return;
    }
    markSelected(matchingRow);
  };
  const handleDone = () => {
    const finalRows = Object.values(scanned || {});
    onScanResult?.(finalRows);
    navigation.goBack();
  };
  // ── Urovo hardware scan engine (laser trigger) ───────────────
  // Same dedupe gate + same processScan as the camera path. On
  // non-Urovo devices this hook is a no-op and camera still works.
  const handleHardwareScan = value => {
    if (processingRef.current) return;

    processingRef.current = true;
    processScan(value);

    setTimeout(() => {
      processingRef.current = false;
    }, 800); // laser scans are deliberate — shorter cooldown than camera
  };

  const hwStatus = useUrovoScanner(handleHardwareScan);

  // Keyboard-wedge fallback: if the device's Scanner Settings output
  // mode is "keyboard", scans type into this invisible input + Enter.
  // Works with ZERO native code — last-resort path for blind deploys.
  const [wedgeBuffer, setWedgeBuffer] = useState("");
  const wedgeRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      wedgeRef.current?.focus?.();
    }, 500);

    return () => clearInterval(timer);
  }, []);

  // const handleWedgeSubmit = () => {
  //   const v = wedgeBuffer;
  //   setWedgeBuffer("");
  //   if (v) handleHardwareScan(v);
  //   // re-focus so the next scan is captured too
  //   setTimeout(() => wedgeRef.current?.focus?.(), 50);
  // };
  const handleWedgeChange = text => {
    setWedgeBuffer(text);

    const clean = cleanScannerValue(text);

    if (clean.length > 5) {
      setTimeout(() => {
        const finalValue = cleanScannerValue(text);

        if (finalValue) {
          setWedgeBuffer("");
          setLastRawScan(finalValue);
          setScannerMessage(`Scan received: ${finalValue.substring(0, 40)}`);
          handleHardwareScan(finalValue);
          setTimeout(() => wedgeRef.current?.focus?.(), 50);
        }
      }, 120);
    }
  };
  const handleWedgeSubmit = () => {
    const v = cleanScannerValue(wedgeBuffer);

    setWedgeBuffer("");

    if (!v) {
      setScannerMessage("No scan text received. Check Scanner Output Mode.");
      return;
    }

    setLastRawScan(v);
    setScannerMessage(`Scan received: ${v.substring(0, 40)}`);

    handleHardwareScan(v);

    setTimeout(() => wedgeRef.current?.focus?.(), 50);
  };

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

  // if (!device) {
  //   return (
  //     <View style={screenStyles.centerBlack}>
  //       <Text style={screenStyles.whiteBold}>Camera not available</Text>
  //       <TouchableOpacity onPress={() => navigation.goBack()} style={screenStyles.closeButton}>
  //         <Text style={screenStyles.closeButtonText}>CLOSE</Text>
  //       </TouchableOpacity>
  //     </View>
  //   );
  // }


  return (
    <View style={screenStyles.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Invisible keyboard-wedge capture (hardware scanner in keyboard mode) */}
      <TextInput
        ref={wedgeRef}
        value={wedgeBuffer}
        onChangeText={handleWedgeChange}
        onSubmitEditing={handleWedgeSubmit}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === "Enter") {
            handleWedgeSubmit();
          }
        }}
        blurOnSubmit={false}
        autoFocus
        showSoftInputOnFocus={false}
        caretHidden
        style={hwStyles.wedgeInput}
      />

      {/* Hardware scanner status pill — tells the operator what mode is live */}
      <View
        pointerEvents="none"
        style={[
          hwStyles.statusPill,
          { backgroundColor: hwStatus.state === "active" ? "#16a34a" : hwStatus.state === "listening" ? "#d97706" : "#475569" },
        ]}
      >
        <Text style={hwStyles.statusPillText}>
          {hwStatus.state === "active"
            ? "HW SCANNER: ACTIVE — use trigger"
            : hwStatus.state === "listening"
              ? "HW: listening (check Scanner Settings)"
              : "CAMERA ONLY"}
        </Text>
      </View>



      <View style={screenStyles.darkOverlay} />

      <SafeAreaView style={screenStyles.safeTop} edges={["top", "left", "right"]}>
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
        <Text style={screenStyles.scanHint}>Press orange trigger button</Text>

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
            <Text style={screenStyles.bottomTitle}>Scanned Cartons ({scannedRows.length})</Text>
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
          keyExtractor={(item, index) =>
            `${index}_${getCartonKey(item)}_${item?.cartno || item?.CartNo || ""}`
          }
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
          ListEmptyComponent={<Text style={screenStyles.emptyText}>No cartons scanned yet</Text>}
        />
        <View style={hwStyles.debugBox}>
          <Text style={hwStyles.debugText}>{scannerMessage}</Text>
          {!!lastRawScan && (
            <Text style={hwStyles.debugText}>Last: {lastRawScan.substring(0, 60)}</Text>
          )}
        </View>

        <SafeAreaView>
          <TouchableOpacity onPress={handleDone} style={screenStyles.doneButton}>
            <Text style={screenStyles.doneButtonText}>DONE</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
}

const screenStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  fullCamera: { ...StyleSheet.absoluteFillObject },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.30)" },
  centerBlack: { flex: 1, backgroundColor: "#020617", justifyContent: "center", alignItems: "center" },
  whiteBold: { color: "#fff", fontWeight: "900" },
  safeTop: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 30 },
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
  headerTitle: { color: "#fff", fontSize: 21, fontWeight: "900" },
  scanCenter: { position: "absolute", top: 118, left: 0, right: 0, alignItems: "center", zIndex: 10 },
  scanHint: { color: "#fff", fontSize: 19, fontWeight: "900", marginBottom: 18 },
  scanBox: { width: SCAN_SIZE, height: SCAN_SIZE, borderRadius: 34, backgroundColor: "rgba(255,255,255,0.035)" },
  cornerTL: { position: "absolute", top: 0, left: 0, width: 62, height: 62, borderTopWidth: 7, borderLeftWidth: 7, borderColor: "#00d4ff", borderTopLeftRadius: 34 },
  cornerTR: { position: "absolute", top: 0, right: 0, width: 62, height: 62, borderTopWidth: 7, borderRightWidth: 7, borderColor: "#00d4ff", borderTopRightRadius: 34 },
  cornerBL: { position: "absolute", bottom: 0, left: 0, width: 62, height: 62, borderBottomWidth: 7, borderLeftWidth: 7, borderColor: "#00d4ff", borderBottomLeftRadius: 34 },
  cornerBR: { position: "absolute", bottom: 0, right: 0, width: 62, height: 62, borderBottomWidth: 7, borderRightWidth: 7, borderColor: "#00d4ff", borderBottomRightRadius: 34 },
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
  statusTitle: { fontSize: 18, fontWeight: "900", color: "#fff" },
  statusMessage: { marginTop: 4, fontSize: 14, fontWeight: "700", color: "#e5e7eb" },
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
  bottomTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  bottomTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  bottomSubTitle: { marginTop: 3, fontSize: 13, fontWeight: "700", color: "#64748b" },
  clearText: { color: "#0f8f9a", fontSize: 13, fontWeight: "900", paddingTop: 4 },
  list: { flex: 1 },
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
  serialText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  cartTitle: { color: "#111827", fontSize: 17, fontWeight: "900" },
  cartLine: { color: "#374151", fontSize: 13, fontWeight: "600", marginTop: 2 },
  emptyText: { color: "#94a3b8", textAlign: "center", marginTop: 20, fontWeight: "800" },
  doneButton: {
    height: 54,
    borderRadius: 17,
    backgroundColor: "#0f8f9a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  doneButtonText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  closeButton: {
    marginTop: 20,
    height: 50,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: "#0f8f9a",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: { color: "#fff", fontWeight: "900" },
});

const hwStyles = StyleSheet.create({
  wedgeInput: {
    position: "absolute",
    top: -100,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
  statusPill: {
    position: "absolute",
    bottom: BOTTOM_SHEET_HEIGHT + 12,
    alignSelf: "center",
    zIndex: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  debugBox: {
    position: "absolute",
    top: 90,
    left: 12,
    right: 12,
    zIndex: 60,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 10,
    padding: 10,
  },
  debugText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
