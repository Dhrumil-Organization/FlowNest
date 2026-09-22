// EnquiryReportScreen.js
// User-wise enquiry summary report, filterable by event.
// Tapping a user card navigates to EnquiryReportDrilldownScreen.
//
// This screen requires internet (it's a report against server data, not an
// offline-first screen like NewEnquiryScreen) — show a simple message if
// offline rather than attempting to load.

import Icon from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getCurrentFinancialYear } from "../../common/commonfunction";
// import { Picker } from '@react-native-picker/picker';
import { API } from "@/common/API/dynamicAPI";
import AsyncStorage from "@/common/utils/compatibleStorage";
import theme from "@/components/theme";
import { LinearGradient } from "expo-linear-gradient";
import api from "./api";
import { isOnline } from "./CardScanService";
import EnquiryReportDrilldownScreen from "./EnquiryReportDrilldownScreen";

// Configure your actual events here, or fetch from an /events endpoint
// if you run many shows per year.
// const EVENTS = [
//   { code: 'all', label: 'All events' },
//   { code: 'bharattex2026', label: 'Bharat Tex 2026' },
//   { code: 'heimtextil2026', label: 'Heimtextil India 2026' },
// ];

export default function EnquiryReportScreen({
  token,
  username,
  showInqReport,
}) {
  const router = useRouter();
  // const [getUserPrptypeFromCache, setUserPrptype] = useState < string > ('');
  const [eventCode, setEventCode] = useState("");
  const [prpCode, setPrpCode] = useState("");
  // const [selectedEvent, setSelectedEvent] = useState(EVENTS[0].code);
  // const [EVENTS, setEVENTS] = useState(EVENTS[0].code);
  const [EVENTS, setEVENTS] = useState([]);
  const [PRPS, setPRPS] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [getEnquiryReportDrilldownVisible, setEnquiryReportDrilldownVisible] =
    useState(false);
  const [getEnquiryReportDrilldownItem, setEnquiryReportDrilldownItem] =
    useState({});
  const [getEnquiryReporteventCode, setEnquiryReporteventCode] = useState();
  const [summary, setSummary] = useState({
    users: [],
    totals: { enquiries: 0, qty: 0, users: 0 },
  });
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [prpModalVisible, setPrpModalVisible] = useState(false);

  const loadEvent = useCallback(async () => {
    const online = await isOnline();
    if (!online) {
      setOffline(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setOffline(false);

    try {
      const yearno = getCurrentFinancialYear();
      const user_prptype = await AsyncStorage.getItem("user_prptype");
      const res = await api.get(
        `${API}/api/getevent?prptype=${user_prptype}&yearno=${yearno}`,
        {
          // params: { event: selectedEvent },
          params: {},
        }
      );
      console.log("event dropdown res", res);
      setEVENTS(res.data.data);
      setEventCode(res.data.data[0].EventId);
      loadPrp(res.data.data[0].EventId);
    } catch (err) {
      console.log("Failed to load report summary", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadPrp = useCallback(async (eventCode) => {
    const online = await isOnline();
    if (!online) {
      setOffline(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setOffline(false);

    try {
      const yearno = getCurrentFinancialYear();
      const user_prptype = await AsyncStorage.getItem("user_prptype");
      const res = await api.get(
        `${API}/api/geteventprptype?prptype=${user_prptype}&yearno=${yearno}`,
        {
          // params: { event: selectedEvent },
          params: {},
        }
      );
      console.log("event dropdown res", res);
      setPRPS(res.data.data);
      setPrpCode(user_prptype ? user_prptype : res.data.data[0].code);
      loadSummary(eventCode, user_prptype);
    } catch (err) {
      console.log("Failed to load report summary", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadSummary = useCallback(async (selectedEvent, prpCode) => {
    const online = await isOnline();
    if (!online) {
      setOffline(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setOffline(false);

    try {
      const res = await api.get(
        `${API}/api/reports/enquiries/summary?prptype=${prpCode}&yearno=27`,
        {
          // params: { event: selectedEvent },
          params: {},
        }
      );
      console.log("loadSummary res", selectedEvent, res);
      setSummary(res.data);
    } catch (err) {
      console.log("Failed to load report summary", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    // loadSummary(eventCode);
    loadEvent();
  }, [eventCode, loadEvent]);

  // useEffect(() => {
  //   // setLoading(true);
  //   // loadSummary(eventCode);
  //   if (!eventCode || !prpCode) return;
  //   loadSummary(eventCode, prpCode);
  // }, [eventCode, prpCode, loadSummary]);

  function onRefresh() {
    setRefreshing(true);
    loadSummary(eventCode, prpCode);
  }

  function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
  }

  function renderUserCard({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          // navigation.navigate('EnquiryReportDrilldown', {
          //   userId: item.user_id,
          //   userName: item.name,
          //   userRole: item.role,
          //   eventCode,
          // })
          // router.push({
          //   pathname: "/EnquiryReportDrilldown",
          //   params: {
          //     userId: item.user_id,
          //     userName: item.name,
          //     userRole: item.role,
          //     eventCode,
          //   },
          // });
          setEnquiryReportDrilldownVisible(true);
          setEnquiryReportDrilldownItem(item);
          setEnquiryReporteventCode(eventCode);
        }}
      >
        <View style={styles.cardHead}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(item.name)}</Text>
          </View>
          <View>
            <Text style={styles.uname}>{item.name}</Text>
            <Text style={styles.urole}>{item.role}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{item.enquiry_count}</Text>
            <Text style={styles.statLbl}>Enquiries</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>
              {item.total_qty.toLocaleString()}
            </Text>
            <Text style={styles.statLbl}>Total qty (m)</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (offline) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.offlineTitle}>Report needs internet</Text>
        <Text style={styles.offlineSub}>
          This report pulls live data from the server. Please reconnect and try
          again.
        </Text>
      </View>
    );
  }

  return (
    <>
      {eventModalVisible && (
        <View style={styles.detailOverlay123}>
          <View style={styles.detailContainer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>{`Event Select`}</Text>
              <TouchableOpacity onPress={() => setEventModalVisible(false)}>
                <Icon name="close" size={24} color={theme.BRAND_GRADIENT_END} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setEventModalVisible(false)}
            >
              <View style={styles.dropdownModal}>
                <FlatList
                  data={EVENTS}
                  keyExtractor={(item) => String(item.EventId)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setEventCode(item.EventId);
                        setEventModalVisible(false);
                        loadSummary(item.EventId, prpCode); // existing functionality
                      }}
                    >
                      <Text style={styles.dropdownItemText}>
                        {item.EventName}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {prpModalVisible && (
        <View style={styles.detailOverlay123}>
          <View style={styles.detailContainer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>{`Property Select`}</Text>
              <TouchableOpacity onPress={() => setPrpModalVisible(false)}>
                <Icon name="close" size={24} color={theme.BRAND_GRADIENT_END} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setPrpModalVisible(false)}
            >
              <View style={styles.dropdownModal}>
                <FlatList
                  data={PRPS}
                  keyExtractor={(item) => String(item.code)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setPrpCode(item.code);
                        setPrpModalVisible(false);
                        loadSummary(eventCode, item.code); // existing functionality
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <LinearGradient
        colors={[theme.BRAND_DARK, theme.BRAND_DARK]}
        style={styles.container1}
      >
        <View style={styles.breadcrumbChip}>
          <View style={styles.breadcrumbRow}>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center" }}
              onPress={() => {
                showInqReport(false);
              }}
            >
              <Icon name="arrow-back" size={18} color="#fff" />
              <Text style={styles.breadcrumbBackText}>Back</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.breadcrumbSeparator}>›</Text>
              <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
                {"Event Report"}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
      <View style={styles.screen}>
        <View style={styles.fieldGroup}>
          <Text style={styles.dropdownLabel}>Event</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setEventModalVisible(true)}
          >
            <Text style={styles.dropdownText}>
              {EVENTS.find((e) => e.EventId === eventCode)?.EventName ||
                "Select Event"}
            </Text>

            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#c2622f" />
        ) : (
          <>
            <Text style={styles.totalsLine}>
              {summary?.totals?.users} users · {summary?.totals?.enquiries}{" "}
              enquiries · {summary?.totals?.qty.toLocaleString()} m total
            </Text>

            <FlatList
              data={summary?.users}
              keyExtractor={(item) => String(item?.user_id)}
              renderItem={renderUserCard}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 24,
              }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <Text style={styles.empty}>
                  No enquiries recorded for this event yet.
                </Text>
              }
            />
          </>
        )}
      </View>

      {getEnquiryReportDrilldownVisible && (
        <View style={styles.detailOverlay456}>
          <View style={styles.detailContainer456}>
            <EnquiryReportDrilldownScreen
              token={token}
              username={username}
              getEnquiryReportDrilldownItem={getEnquiryReportDrilldownItem}
              setEnquiryReportDrilldownItem={setEnquiryReportDrilldownItem}
              setEnquiryReportDrilldownVisible={
                setEnquiryReportDrilldownVisible
              }
              getEnquiryReporteventCode={getEnquiryReporteventCode}
              setEnquiryReporteventCode={setEnquiryReporteventCode}
              showInqReport={showInqReport}
            />
          </View>
        </View>
      )}
    </>
  );
}

const C = {
  brand: "#B3552C",
  brandSoft: "#FBEEE6",
  ink: "#1F2937",
  muted: "#6B7280",
  faint: "#9CA3AF",
  bg: "#FBFAF7",
  surface: "#FFFFFF",
  border: "#ECE9E2",
};

const shadowSoft = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: C.ink,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  pickerWrap: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 11,
    backgroundColor: C.surface,
    marginBottom: 8,
    marginTop: 8,
    overflow: "hidden",
  },
  totalsLine: {
    fontSize: 12,
    color: C.muted,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontWeight: "600",
  },
  card: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.surface,
    padding: 16,
    marginBottom: 12,
    ...shadowSoft,
  },
  cardHead: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: C.brand, fontWeight: "800", fontSize: 14 },
  uname: { fontSize: 15, fontWeight: "800", color: C.ink },
  urole: { fontSize: 11.5, color: C.muted, marginTop: 1 },
  statRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 14,
  },
  stat: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "800", color: C.ink },
  statLbl: {
    fontSize: 10,
    color: C.faint,
    marginTop: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  empty: { textAlign: "center", color: C.muted, fontSize: 13, marginTop: 40 },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: C.bg,
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.ink,
    marginBottom: 6,
  },
  offlineSub: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    lineHeight: 19,
  },
  fieldGroup: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
  },

  dropdownLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
    marginBottom: 6,
  },

  dropdown: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: C.ink,
  },

  dropdownArrow: {
    fontSize: 12,
    color: C.muted,
  },

  dropdownModal: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 120,
    borderRadius: 12,
    maxHeight: 320,
  },

  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  dropdownItemText: {
    fontSize: 15,
    color: "#222",
  },
  detailOverlay123: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent black
    zIndex: 300, // Higher than summary modal
    justifyContent: "center",
    alignItems: "center",
  },
  detailOverlay456: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent black
    zIndex: 200, // Higher than summary modal
    justifyContent: "center",
    alignItems: "center",
  },
  detailContainer456: {
    backgroundColor: "#fff",
    borderRadius: 10,
    width: "100%",
    height: "100%",
    elevation: 5, // Shadow for Android
    shadowColor: "#000", // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Detail Container
  detailContainer: {
    backgroundColor: "#fff",
    // padding: 20,
    paddingTop: 45,
    borderRadius: 10,
    width: "100%",
    height: "100%",
    elevation: 5, // Shadow for Android
    shadowColor: "#000", // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  drawerHeader: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  drawerTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.BRAND_GRADIENT_END,
  },
  breadcrumbChip: {
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 14,
    borderBlockColor: "rgba(255,255,255,0.15)",
    borderTopWidth: 1,
    paddingVertical: 6,
    width: "100%",
  },
  breadcrumbRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  breadcrumbSeparator: {
    color: "#fff",
    marginHorizontal: 6,
  },
  breadcrumbBackText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.9,
  },
  breadcrumbCurrent: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
});
