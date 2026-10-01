// EnquiryReportScreen.js
// User-wise enquiry summary report, filterable by event.
// NEW ERP UI: re-skinned (T tokens + erpUi kit); data loading logic unchanged.
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
import api from "./api";
import { isOnline } from "./CardScanService";
import EnquiryReportDrilldownScreen from "./EnquiryReportDrilldownScreen";
import { S, T } from "@/src/theme";
import {
  CONTENT_MAX,
  EmptyState,
  IconBtn,
  Kpi,
  KpiGrid,
  Metric,
  PanelHeader,
  PickField,
  SectionHead,
  Sheet,
  cellWidth,
  useSotLayout,
} from "@/src/components/erpUi";

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
  // ===== NEW ERP UI (presentation only) =====
  const { isPhone, cols, gutter } = useSotLayout();

  function renderUserCard({ item }) {
    return (
      <View style={[cellWidth(cols), styles.gridCell]}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Open enquiries of ${item.name}`}
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
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.uname} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.urole} numberOfLines={1}>{item.role}</Text>
            </View>
            <Icon name="chevron-right" size={22} color={T.muted} />
          </View>
          <View style={styles.statRow}>
            <Metric label="Enquiries" value={String(item.enquiry_count)} />
            <Metric
              label="Total qty (m)"
              value={item.total_qty.toLocaleString()}
              color={T.copper}
              align="right"
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  const header = (
    <PanelHeader
      onBack={() => {
        showInqReport(false);
      }}
      crumbs={["Event"]}
      title="Event Report"
      subtitle="User-wise enquiry summary"
    />
  );

  if (offline) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.centerScreen}>
          <EmptyState
            icon="wifi-off"
            title="Report needs internet"
            text="This report pulls live data from the server. Please reconnect and try again."
          />
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.screen}>
        {header}

        <View style={[styles.top, { paddingHorizontal: gutter }]}>
          <View style={styles.topInner}>
            <PickField
              label="Event"
              icon="event"
              value={EVENTS.find((e) => e.EventId === eventCode)?.EventName || ""}
              placeholder="Select Event"
              onPress={() => setEventModalVisible(true)}
              style={isPhone ? null : { width: 360 }}
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={T.copper} size="large" />
            <Text style={styles.loadingText}>Loading report…</Text>
          </View>
        ) : (
          <FlatList
            key={`u-${cols}`}
            data={summary?.users}
            keyExtractor={(item) => String(item?.user_id)}
            renderItem={renderUserCard}
            numColumns={cols}
            style={{ flex: 1 }}
            contentContainerStyle={[styles.listContent, { paddingHorizontal: gutter - 5 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.copper} colors={[T.copper]} />
            }
            ListHeaderComponent={
              <View style={styles.listHead}>
                <KpiGrid isPhone={isPhone}>
                  <Kpi label="Users" value={String(summary?.totals?.users ?? 0)} icon="groups" accent={T.blue} />
                  <Kpi label="Enquiries" value={String(summary?.totals?.enquiries ?? 0)} icon="assignment" accent={T.copper} />
                  <Kpi
                    label="Total qty"
                    value={`${summary?.totals?.qty.toLocaleString()} m`}
                    icon="straighten"
                    accent={T.green}
                  />
                </KpiGrid>
                <View style={{ marginTop: 10 }}>
                  <SectionHead
                    title="By user"
                    meta={`${summary?.totals?.users} users · ${summary?.totals?.enquiries} enquiries · ${summary?.totals?.qty.toLocaleString()} m total`}
                    right={<IconBtn icon="refresh" label="Refresh" onPress={onRefresh} loading={refreshing} />}
                  />
                </View>
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                icon="assignment"
                title="No enquiries yet"
                text="No enquiries recorded for this event yet."
              />
            }
          />
        )}
      </View>

      <Sheet
        open={eventModalVisible}
        onClose={() => setEventModalVisible(false)}
        eyebrow="EVENT REPORT"
        title="Event Select"
        wideMax={460}
      >
        {EVENTS.map((item) => (
          <TouchableOpacity
            key={String(item.EventId)}
            style={[styles.option, item.EventId === eventCode && styles.optionOn]}
            onPress={() => {
              setEventCode(item.EventId);
              setEventModalVisible(false);
              loadSummary(item.EventId, prpCode); // existing functionality
            }}
          >
            <Icon name="event" size={17} color={item.EventId === eventCode ? T.nav : T.copper} />
            <Text style={styles.optionText} numberOfLines={2}>
              {item.EventName}
            </Text>
            {item.EventId === eventCode ? <Icon name="check" size={20} color={T.nav} /> : null}
          </TouchableOpacity>
        ))}
      </Sheet>

      <Sheet
        open={prpModalVisible}
        onClose={() => setPrpModalVisible(false)}
        eyebrow="EVENT REPORT"
        title="Property Select"
        wideMax={460}
      >
        {PRPS.map((item) => (
          <TouchableOpacity
            key={String(item.code)}
            style={[styles.option, item.code === prpCode && styles.optionOn]}
            onPress={() => {
              setPrpCode(item.code);
              setPrpModalVisible(false);
              loadSummary(eventCode, item.code); // existing functionality
            }}
          >
            <Icon name="business" size={17} color={item.code === prpCode ? T.nav : T.copper} />
            <Text style={styles.optionText} numberOfLines={2}>{item.name}</Text>
            {item.code === prpCode ? <Icon name="check" size={20} color={T.nav} /> : null}
          </TouchableOpacity>
        ))}
      </Sheet>

      {getEnquiryReportDrilldownVisible && (
        <View style={styles.detailOverlay456}>
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
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  top: {
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingVertical: 10,
  },
  topInner: { width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center" },
  listContent: {
    width: "100%",
    maxWidth: CONTENT_MAX,
    alignSelf: "center",
    paddingTop: 12,
    paddingBottom: 28,
  },
  listHead: { paddingHorizontal: 5, marginBottom: 4 },
  gridCell: { padding: 5 },
  card: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    backgroundColor: T.surface,
    padding: 14,
    gap: 12,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: T.nav,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  uname: { fontSize: 15, fontWeight: "800", color: T.ink },
  urole: { fontSize: 12, fontWeight: "600", color: T.muted, marginTop: 1 },
  statRow: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: T.sub,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.hair,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  loadingBox: { alignItems: "center", paddingTop: 48, gap: 10 },
  loadingText: { fontSize: 13, fontWeight: "700", color: T.muted },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: T.bg,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  optionOn: { borderColor: `${T.nav}66`, backgroundColor: T.sub },
  optionText: { flex: 1, fontSize: 14, fontWeight: "700", color: T.ink },
  detailOverlay456: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: T.bg,
    zIndex: 200, // Higher than summary modal
  },
});
