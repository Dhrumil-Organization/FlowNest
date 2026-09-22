import { API } from "@/common/API/dynamicAPI";
import AppAlert from "@/common/utils/appAlert";
import AsyncStorage from "@/common/utils/compatibleStorage";
import theme from "@/components/theme";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getCurrentFinancialYear } from "../../common/commonfunction";
import api from "./api";
import { deleteEnquiries } from "./syncService";

export default function EnquiryReportDrilldownScreen({
  token,
  username,
  getEnquiryReportDrilldownItem,
  setEnquiryReportDrilldownItem,
  setEnquiryReportDrilldownVisible,
  getEnquiryReporteventCode,
  setEnquiryReporteventCode,
  showInqReport,
}) {
  const router = useRouter();
  // const params = useLocalSearchParams();
  // const { userId, userName, userRole } = getEnquiryReportDrilldownItem;
  const userId = getEnquiryReportDrilldownItem.user_id;
  const userName = getEnquiryReportDrilldownItem.name;
  const userRole = getEnquiryReportDrilldownItem.role;
  const eventCode = getEnquiryReporteventCode;
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [getUserPrptype, setUserPrptype] = useState("");
  // const [getUserPrptype, setUserPrptypeFromAPI] = useState('');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user_prptype = await AsyncStorage.getItem("user_prptype");
        console.log("user_prptype", user_prptype);
        setUserPrptype(user_prptype);
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };
    initializeApp();
  }, [token, getUserPrptype]);

  // Load enquiries
  const loadEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `${API}/api/reports/enquiries/user/${userId}?prptype=S&yearno=27`,
        {
          params: { event: eventCode },
        }
      );
      console.log("User enquiries:", userId, res.data.enquiries);
      setEnquiries(res.data.enquiries || []);
    } catch (err) {
      console.log("Failed to load user enquiries:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, eventCode]);

  // Reload enquiries when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadEnquiries();
    }, [loadEnquiries])
  );

  // Handle Edit button press
  const handleEdit = (item) => {
    setSelected(null); // Close modal if open
    showInqReport(false);
    setEnquiryReportDrilldownVisible(false);
    setEnquiryReportDrilldownItem({});
    setEnquiryReporteventCode("");
    router.replace({
      pathname: "/new/event",
      params: {
        id: item.id,
        prptype: item.prptype || getUserPrptype, // Use the prptype from the item or fallback to the user's prptype
      },
    });
  };

  // Handle Delete button press
  const handleDelete = async (item) => {
    setSelected(null); // Close modal if open
    try {
      const token = await AsyncStorage.getItem("access_token");
      const user_prptype = await AsyncStorage.getItem("user_prptype");
      const result = await deleteEnquiries(
        item.id,
        token,
        getCurrentFinancialYear(),
        user_prptype
      );

      console.log(
        "API RESULT =>",
        getCurrentFinancialYear(),
        user_prptype,
        result
      );

      if (result.success === true) {
        AppAlert.alert(`${result.message} for ${item.party_name}!`);
        loadEnquiries();
      }
    } catch (err) {
      console.log("LOAD ERROR =>", err);
    }
  };

  // Render each row in the FlatList
  const renderRow = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => setSelected(item)}>
      <View style={styles.rowLeft}>
        <Text style={styles.party}>{item.party_name}</Text>
        <Text style={styles.sub}>
          {item.contact_name || "No contact name"} ·{" "}
          {formatDate(item.created_at)}
        </Text>
        <Text style={styles.sub}>
          {"Property: " +
            (item.prptype === "S"
              ? "WEAVING"
              : item.prptype === "K"
              ? "KNITTING"
              : item.prptype === "V"
              ? "VENTURE"
              : item.prptype === "R"
              ? "YARN"
              : "" || "No prptype")}
        </Text>
        {Array.isArray(item.items) && item.items.length > 0 && (
          <View style={styles.itemsBadge}>
            <Icon name="inventory-2" color="#B3552C" size={12} />
            <Text style={styles.itemsBadgeText}>
              {item.items.length} item{item.items.length > 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.qty}>
          <Text style={styles.qtyNum}>
            {Number(item.qty_required || 0).toLocaleString()}
          </Text>{" "}
          m
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => handleEdit(item)}
          >
            <Icon name="edit" color="#2196F3" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
          >
            <Icon name="delete" color="#F44336" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // Pull-to-refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    loadEnquiries();
  };

  // Render header with refresh button
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerName}>{userName}</Text>
      <View style={styles.headerRow}>
        <Text style={styles.headerSub}>
          {userRole} · {enquiries.length} enquiries
        </Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Icon name="refresh" color="#6b7280" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Small helper — some API payloads have keys with stray trailing spaces
  // (e.g. "item_unit ", "is_new_item  "). This looks up a key tolerant of that.
  const getField = (obj, key) => {
    if (!obj) return undefined;
    if (obj[key] !== undefined) return obj[key];
    const foundKey = Object.keys(obj).find((k) => k.trim() === key);
    return foundKey ? obj[foundKey] : undefined;
  };

  // Small helper — nicely formats numeric-ish strings like ".00" / "45.00"
  const formatNum = (val) => {
    if (val === null || val === undefined || val === "") return "—";
    const n = Number(val);
    if (Number.isNaN(n)) return String(val);
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Per-design detail table (dsn_code, dsn_name, qty, unit, rate, remark, is_new)
  const renderDesignsTable = (designs) => {
    if (!Array.isArray(designs) || designs.length === 0) {
      return <Text style={styles.noDesignText}>No designs added</Text>;
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.designsTable}>
          <View style={styles.designsTableHeaderRow}>
            <Text style={[styles.designsHeaderCell, { width: 70 }]}>Code</Text>
            <Text style={[styles.designsHeaderCell, { width: 160 }]}>
              Design Name
            </Text>
            <Text style={[styles.designsHeaderCell, { width: 65 }]}>Qty</Text>
            <Text style={[styles.designsHeaderCell, { width: 55 }]}>Unit</Text>
            <Text style={[styles.designsHeaderCell, { width: 70 }]}>Rate</Text>
            <Text style={[styles.designsHeaderCell, { width: 100 }]}>
              Remark
            </Text>
            <Text style={[styles.designsHeaderCell, { width: 70 }]}>
              Status
            </Text>
          </View>

          {designs.map((d, dIdx) => {
            const isNew = d && (d.is_new === true || d.is_new_item === true);
            return (
              <View
                key={dIdx}
                style={[
                  styles.designsRow,
                  dIdx % 2 === 1 && styles.designsRowAlt,
                ]}
              >
                <Text style={[styles.designsCell, { width: 70 }]}>
                  {d.dsn_code || "—"}
                </Text>
                <Text
                  style={[styles.designsCell, { width: 160 }]}
                  numberOfLines={2}
                >
                  {d.dsn_name || "—"}
                </Text>
                <Text style={[styles.designsCell, { width: 65 }]}>
                  {formatNum(d.dsn_qty)}
                </Text>
                <Text style={[styles.designsCell, { width: 55 }]}>
                  {d.unit || "—"}
                </Text>
                <Text style={[styles.designsCell, { width: 70 }]}>
                  {formatNum(d.dsn_rate)}
                </Text>
                <Text
                  style={[styles.designsCell, { width: 100 }]}
                  numberOfLines={2}
                >
                  {d.remark || "—"}
                </Text>
                <View style={{ width: 70 }}>
                  {isNew ? (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  ) : (
                    <View style={styles.existingBadge}>
                      <Text style={styles.existingBadgeText}>Existing</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // Dynamic Items + Designs — handles any number of items,
  // each with zero or more designs (with full dsn_* detail).
  const renderItemsTable = (items, prptype) => {
    if (!Array.isArray(items) || items.length === 0) {
      return (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Items</Text>
          <Text style={styles.noItemsText}>
            No items added for this enquiry.
          </Text>
        </View>
      );
    }

    console.log(
      "Rendering items table for enquiry:",
      selected ? selected.id : "N/A",
      items
    );
    console.log("Rendering items for prptype:", prptype);

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Items ({items.length})</Text>

        {items.map((it, idx) => {
          const designCount = Array.isArray(it.designs) ? it.designs.length : 0;
          const isNewItem =
            it &&
            (it.is_new === true ||
              getField(it, "is_new_item") === true ||
              getField(it, "is_new_item") === "true" ||
              getField(it, "is_new_item") === 1);

          const itemRate = getField(it, "item_rate");
          const itemQty = getField(it, "item_qty");
          const itemUnit = getField(it, "item_unit");
          const itemRemark = getField(it, "item_remark");
          const hasItemInfo =
            itemRate !== undefined ||
            itemQty !== undefined ||
            itemUnit !== undefined ||
            (itemRemark !== undefined && itemRemark !== "");

          return (
            <View
              key={it.item_code ? `${it.item_code}-${idx}` : idx}
              style={styles.itemCard}
            >
              <View style={styles.itemCardHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.itemCardTitle} numberOfLines={2}>
                    {it.item_name || "—"}
                  </Text>
                  <Text style={styles.itemCardMeta}>
                    Code: {it.item_code || "—"} · {designCount} design
                    {designCount !== 1 ? "s" : ""}
                  </Text>
                </View>
                {isNewItem && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW ITEM</Text>
                  </View>
                )}
              </View>

              {/* {hasItemInfo && getUserPrptype !== 'S' && ( */}
              {hasItemInfo && prptype !== "S" && (
                <View style={styles.itemInfoRow}>
                  <View style={styles.itemInfoCell}>
                    <Text style={styles.itemInfoLabel}>Rate</Text>
                    <Text style={styles.itemInfoValue}>
                      {formatNum(itemRate)}
                    </Text>
                  </View>
                  <View style={styles.itemInfoCell}>
                    <Text style={styles.itemInfoLabel}>Qty</Text>
                    <Text style={styles.itemInfoValue}>
                      {formatNum(itemQty)}
                    </Text>
                  </View>
                  <View style={styles.itemInfoCell}>
                    <Text style={styles.itemInfoLabel}>Unit</Text>
                    <Text style={styles.itemInfoValue}>{itemUnit || "—"}</Text>
                  </View>
                  <View style={[styles.itemInfoCell, { flex: 1.4 }]}>
                    <Text style={styles.itemInfoLabel}>Remark</Text>
                    <Text style={styles.itemInfoValue} numberOfLines={2}>
                      {itemRemark || "—"}
                    </Text>
                  </View>
                </View>
              )}
              {prptype === "S" && (
                <View style={styles.itemCardBody}>
                  {renderDesignsTable(it.designs)}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // Loading indicator
  if (loading && !refreshing) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color="#c2622f" size="large" />
      </View>
    );
  }

  return (
    <>
      {/* <HeaderBarwithBack
        userName={username}
        header={"Event Report Details"}
        breadcrumb={"Event Report Details"}
        SearchBar={false}
      /> */}
      <LinearGradient
        colors={[theme.BRAND_DARK, theme.BRAND_DARK]}
        style={styles.container1}
      >
        <View style={styles.breadcrumbChip}>
          <View style={styles.breadcrumbRow}>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center" }}
              onPress={() => {
                setEnquiryReportDrilldownVisible(false);
                setEnquiryReporteventCode("");
                setEnquiryReportDrilldownItem({});
              }}
            >
              <Icon name="arrow-back" size={18} color="#fff" />
              <Text style={styles.breadcrumbBackText}>Back</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.breadcrumbSeparator}>›</Text>
              <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
                {"Event Report Details"}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
      <View style={styles.screen}>
        <FlatList
          data={enquiries}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRow}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <Text style={styles.empty}>No enquiries from this user yet.</Text>
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />

        {/* Full-screen Detail Modal */}
        <Modal
          visible={!!selected}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setSelected(null)}
        >
          <View style={styles.fullModalContainer}>
            {/* Modal header */}
            <View style={styles.fullModalHeader}>
              <TouchableOpacity
                style={styles.fullModalBackBtn}
                onPress={() => setSelected(null)}
              >
                <Icon name="arrow-back" color={C.ink} size={22} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.fullModalHeaderTitle} numberOfLines={1}>
                  {selected ? selected.party_name : ""}
                </Text>
                {selected && (
                  <Text style={styles.fullModalHeaderSub}>
                    Enquiry #{selected.id} · {formatDate(selected.created_at)}
                  </Text>
                )}
              </View>
              {selected && (
                <View style={styles.fullModalHeaderActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleEdit(selected)}
                  >
                    <Icon name="edit" color="#2196F3" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(selected)}
                  >
                    <Icon name="delete" color="#F44336" size={20} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {selected && (
              <ScrollView
                style={styles.fullModalScroll}
                contentContainerStyle={styles.fullModalContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Party / contact info */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Party Details</Text>
                  <DetailRow
                    label="Contact name"
                    value={selected.contact_name}
                  />
                  <DetailRow label="Designation" value={selected.designation} />
                  <DetailRow label="Mobile" value={selected.mobile} />
                  <DetailRow label="Email" value={selected.email} />
                  <DetailRow label="Address" value={selected.address} />
                  <DetailRow label="GST No." value={selected.gst_no} />
                  <DetailRow
                    label="Property"
                    value={
                      selected.prptype === "S"
                        ? "WEAVING"
                        : selected.prptype === "K"
                        ? "KNITTING"
                        : selected.prptype === "V"
                        ? "VENTURE"
                        : selected.prptype === "R"
                        ? "YARN"
                        : "" || "No prptype"
                    }
                  />
                </View>

                {/* Requirement info */}
                {/* <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Requirement</Text>
                  <DetailRow
                    label="Design requirement"
                    value={selected.design_requirement}
                  />
                  <DetailRow
                    label="Colour requirement"
                    value={selected.colour_requirement}
                  />
                  <DetailRow
                    label="Qty required"
                    value={
                      selected.qty_required
                        ? `${Number(selected.qty_required).toLocaleString()} m`
                        : null
                    }
                  />
                  <DetailRow
                    label="Price"
                    value={selected.price ? `₹${selected.price}/m` : null}
                  />
                </View> */}

                {/* Dynamic items + full design detail tables */}
                {renderItemsTable(selected.items, selected.prptype)}
              </ScrollView>
            )}
          </View>
        </Modal>
      </View>
    </>
  );
}

// Detail Row Component
function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailKey}>{label}</Text>
      <Text style={styles.detailVal}>{value || "—"}</Text>
    </View>
  );
}

// Styles
const C = {
  brand: "#B3552C",
  ink: "#1F2937",
  body: "#374151",
  muted: "#6B7280",
  bg: "#FBFAF7",
  surface: "#FFFFFF",
  border: "#ECE9E2",
  editBg: "#E8F0FE",
  deleteBg: "#FDECEA",
  headerBg: "#F5F1EA",
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
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerName: { fontSize: 18, fontWeight: "800", color: C.ink },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surface,
    padding: 14,
    marginBottom: 10,
    ...shadowSoft,
  },
  rowLeft: { flex: 1 },
  party: { fontSize: 14, fontWeight: "800", color: C.ink },
  sub: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  itemsBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: C.headerBg,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 6,
    gap: 4,
  },
  itemsBadgeText: { fontSize: 10.5, color: C.brand, fontWeight: "700" },
  rowRight: { alignItems: "flex-end", flexDirection: "row", gap: 8 },
  qty: { fontSize: 13, color: C.body },
  qtyNum: { fontWeight: "800" },
  buttonContainer: { flexDirection: "row", gap: 8 },
  editBtn: { padding: 8, backgroundColor: C.editBg, borderRadius: 9 },
  deleteBtn: { padding: 8, backgroundColor: C.deleteBg, borderRadius: 9 },
  empty: { textAlign: "center", color: C.muted, fontSize: 13, marginTop: 40 },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },

  // Full-screen modal
  fullModalContainer: { flex: 1, backgroundColor: C.bg },
  fullModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
    marginTop: 50,
    ...shadowSoft,
  },
  fullModalBackBtn: { padding: 6 },
  fullModalHeaderTitle: { fontSize: 16, fontWeight: "800", color: C.ink },
  fullModalHeaderSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  fullModalHeaderActions: { flexDirection: "row", gap: 8 },
  fullModalScroll: { flex: 1 },
  fullModalContent: { padding: 16, paddingBottom: 40 },

  sectionCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 14,
    ...shadowSoft,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: C.brand,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailKey: { fontSize: 13, color: C.muted },
  detailVal: {
    fontSize: 13,
    color: C.ink,
    fontWeight: "600",
    textAlign: "right",
    maxWidth: "60%",
  },

  // Item card (one per item, contains its own design table)
  itemCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: C.surface,
  },
  itemCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.headerBg,
  },
  itemCardTitle: { fontSize: 13, fontWeight: "800", color: C.ink },
  itemCardMeta: {
    fontSize: 10.5,
    color: C.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  itemCardBody: { paddingVertical: 8, paddingHorizontal: 4 },

  // Item-level info strip (item_rate / item_qty / item_unit / item_remark)
  itemInfoRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: "#FCFBF8",
  },
  itemInfoCell: { flex: 1, paddingRight: 6 },
  itemInfoLabel: {
    fontSize: 9.5,
    color: C.muted,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  itemInfoValue: { fontSize: 12, color: C.ink, fontWeight: "700" },

  // Designs table (horizontally scrollable — full dsn_* detail)
  designsTable: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  designsTableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F0EBE1",
  },
  designsHeaderCell: {
    fontSize: 9.5,
    fontWeight: "800",
    color: C.muted,
    paddingVertical: 8,
    paddingHorizontal: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  designsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
    alignItems: "center",
  },
  designsRowAlt: { backgroundColor: "#FCFBF8" },
  designsCell: {
    fontSize: 11.5,
    color: C.ink,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontWeight: "600",
  },
  newBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  newBadgeText: { fontSize: 9.5, fontWeight: "800", color: "#15803D" },
  existingBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  existingBadgeText: { fontSize: 9.5, fontWeight: "700", color: "#475569" },

  noDesignText: {
    fontSize: 11.5,
    color: C.muted,
    fontStyle: "italic",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  noItemsText: {
    fontSize: 12.5,
    color: C.muted,
    fontStyle: "italic",
    paddingVertical: 4,
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
