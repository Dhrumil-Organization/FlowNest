// NEW ERP UI: re-skinned (T tokens + erpUi kit); data loading / edit / delete logic unchanged.
import { API } from "@/common/API/dynamicAPI";
import AppAlert from "@/common/utils/appAlert";
import AsyncStorage from "@/common/utils/compatibleStorage";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
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
  useWindowDimensions,
  View,
} from "react-native";
import { getCurrentFinancialYear } from "../../common/commonfunction";
import api from "./api";
import { deleteEnquiries } from "./syncService";
import { S, T } from "@/src/theme";
import {
  CONTENT_MAX,
  EmptyState,
  IconBtn,
  Kpi,
  KpiGrid,
  Metric,
  PanelHeader,
  cellWidth,
  useSotLayout,
} from "@/src/components/erpUi";
import { ModalPanel } from "./ui";

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

  // ===== NEW ERP UI (presentation only) =====
  const { isPhone, cols, gutter } = useSotLayout();
  const { width: winW } = useWindowDimensions();
  const detailTwoCol = winW >= 720;

  const prpLabel = (p) =>
    p === "S"
      ? "WEAVING"
      : p === "K"
      ? "KNITTING"
      : p === "V"
      ? "VENTURE"
      : p === "R"
      ? "YARN"
      : "" || "No prptype";

  const totalQty = enquiries.reduce((n, e) => n + (Number(e?.qty_required) || 0), 0);
  const totalItems = enquiries.reduce((n, e) => n + (Array.isArray(e?.items) ? e.items.length : 0), 0);

  // Render each row in the FlatList
  const renderRow = ({ item }) => (
    <View style={[cellWidth(cols), styles.gridCell]}>
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => setSelected(item)}
        accessibilityRole="button"
        accessibilityLabel={`Open enquiry ${item.party_name}`}
      >
        <View style={styles.rowHead}>
          <View style={styles.rowIcon}>
            <Icon name="storefront" size={18} color={T.copper} />
          </View>
          <View style={styles.rowLeft}>
            <Text style={styles.party} numberOfLines={2}>{item.party_name}</Text>
            <Text style={styles.sub} numberOfLines={2}>
              {item.contact_name || "No contact name"} ·{" "}
              {formatDate(item.created_at)}
            </Text>
          </View>
          <View style={styles.qtyBox}>
            <Text style={styles.qtyNum} numberOfLines={1}>
              {Number(item.qty_required || 0).toLocaleString()}
            </Text>
            <Text style={styles.qtyUnit}>m</Text>
          </View>
        </View>

        <View style={styles.rowFoot}>
          <View style={styles.chips}>
            <View style={styles.prpChip}>
              <Icon name="business" color={T.nav} size={12} />
              <Text style={styles.prpChipText} numberOfLines={1}>
                {"Property: " + prpLabel(item.prptype)}
              </Text>
            </View>
            {Array.isArray(item.items) && item.items.length > 0 && (
              <View style={styles.itemsBadge}>
                <Icon name="inventory-2" color={T.copper} size={12} />
                <Text style={styles.itemsBadgeText}>
                  {item.items.length} item{item.items.length > 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.buttonContainer}>
            <IconBtn icon="edit" color={T.blue} label="Edit enquiry" onPress={() => handleEdit(item)} />
            <IconBtn icon="delete" color={T.red} tone="danger" label="Delete enquiry" onPress={() => handleDelete(item)} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
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

  // Header (Back + breadcrumb + user + refresh) — Back runs the original close statements.
  const renderHeader = () => (
    <PanelHeader
      onBack={() => {
        setEnquiryReportDrilldownVisible(false);
        setEnquiryReporteventCode("");
        setEnquiryReportDrilldownItem({});
      }}
      crumbs={["Event Report", "Event Report Details"]}
      title={userName || "Event Report Details"}
      subtitle={`${userRole || ""} · ${enquiries.length} enquiries`}
      right={<IconBtn icon="refresh" label="Refresh" onPress={onRefresh} loading={refreshing} />}
    />
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
            <Text style={[styles.designsHeaderCell, { width: 170 }]}>
              Design Name
            </Text>
            <Text style={[styles.designsHeaderCell, styles.num, { width: 70 }]}>Qty</Text>
            <Text style={[styles.designsHeaderCell, { width: 60 }]}>Unit</Text>
            <Text style={[styles.designsHeaderCell, styles.num, { width: 75 }]}>Rate</Text>
            <Text style={[styles.designsHeaderCell, { width: 130 }]}>
              Remark
            </Text>
            <Text style={[styles.designsHeaderCell, { width: 84 }]}>
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
                <Text style={[styles.designsCell, styles.codeCell, { width: 70 }]}>
                  {d.dsn_code || "—"}
                </Text>
                <Text
                  style={[styles.designsCell, { width: 170, fontWeight: "800" }]}
                  numberOfLines={2}
                >
                  {d.dsn_name || "—"}
                </Text>
                <Text style={[styles.designsCell, styles.num, { width: 70 }]}>
                  {formatNum(d.dsn_qty)}
                </Text>
                <Text style={[styles.designsCell, { width: 60 }]}>
                  {d.unit || "—"}
                </Text>
                <Text style={[styles.designsCell, styles.num, { width: 75 }]}>
                  {formatNum(d.dsn_rate)}
                </Text>
                <Text
                  style={[styles.designsCell, { width: 130 }]}
                  numberOfLines={2}
                >
                  {d.remark || "—"}
                </Text>
                <View style={{ width: 84, paddingHorizontal: 8 }}>
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
                <View style={styles.itemNo}>
                  <Text style={styles.itemNoText}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
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
                  <Metric label="Rate" value={formatNum(itemRate)} />
                  <Metric label="Qty" value={formatNum(itemQty)} color={T.copper} />
                  <Metric label="Unit" value={itemUnit || "—"} />
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
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.centerScreen}>
          <ActivityIndicator color={T.copper} size="large" />
          <Text style={styles.loadingText}>Loading enquiries…</Text>
        </View>
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
      <View style={styles.screen}>
        {renderHeader()}
        <FlatList
          key={`e-${cols}`}
          data={enquiries}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRow}
          numColumns={cols}
          style={{ flex: 1 }}
          ListHeaderComponent={
            enquiries.length > 0 ? (
              <View style={styles.listHead}>
                <KpiGrid isPhone={isPhone}>
                  <Kpi label="Enquiries" value={String(enquiries.length)} icon="assignment" accent={T.copper} />
                  <Kpi label="Total qty" value={`${totalQty.toLocaleString()} m`} icon="straighten" accent={T.green} />
                  <Kpi label="Items" value={String(totalItems)} icon="inventory-2" accent={T.blue} />
                </KpiGrid>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState icon="assignment" title="No enquiries from this user yet." />
          }
          contentContainerStyle={[styles.listContent, { paddingHorizontal: gutter - 5 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.copper} colors={[T.copper]} />
          }
        />

        {/* Detail panel (bottom sheet on phone, side panel on wide screens) */}
        <ModalPanel
          open={!!selected}
          onClose={() => setSelected(null)}
          side
          wideMax={780}
          eyebrow={selected ? `ENQUIRY #${selected.id}` : "ENQUIRY"}
          title={selected ? selected.party_name : ""}
          subtitle={selected ? formatDate(selected.created_at) : ""}
          right={
            selected ? (
              <View style={styles.fullModalHeaderActions}>
                <IconBtn icon="edit" color={T.blue} label="Edit enquiry" onPress={() => handleEdit(selected)} />
                <IconBtn icon="delete" color={T.red} tone="danger" label="Delete enquiry" onPress={() => handleDelete(selected)} />
              </View>
            ) : null
          }
        >
          {selected && (
            <ScrollView
              style={styles.fullModalScroll}
              contentContainerStyle={styles.fullModalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Party / contact info */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Party Details</Text>
                <View style={styles.detailGrid}>
                  <DetailRow
                    label="Contact name"
                    value={selected.contact_name}
                    half={detailTwoCol}
                  />
                  <DetailRow label="Designation" value={selected.designation} half={detailTwoCol} />
                  <DetailRow label="Mobile" value={selected.mobile} half={detailTwoCol} />
                  <DetailRow label="Email" value={selected.email} half={detailTwoCol} />
                  <DetailRow label="Address" value={selected.address} />
                  <DetailRow label="GST No." value={selected.gst_no} half={detailTwoCol} />
                  <DetailRow
                    label="Property"
                    value={prpLabel(selected.prptype)}
                    half={detailTwoCol}
                  />
                </View>
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
        </ModalPanel>
      </View>
    </>
  );
}

// Detail Row Component
function DetailRow({ label, value, half = false }) {
  return (
    <View style={[styles.detailRow, half ? styles.detailHalf : styles.detailFull]}>
      <Text style={styles.detailKey}>{label}</Text>
      <Text style={styles.detailVal}>{value || "—"}</Text>
    </View>
  );
}

// Styles (NEW ERP tokens)
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  listContent: {
    width: "100%",
    maxWidth: CONTENT_MAX,
    alignSelf: "center",
    paddingTop: 12,
    paddingBottom: 28,
  },
  listHead: { paddingHorizontal: 5, marginBottom: 6 },
  gridCell: { padding: 5 },
  row: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    backgroundColor: T.surface,
    padding: 13,
    gap: 12,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  rowHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${T.copper}14`,
  },
  rowLeft: { flex: 1, minWidth: 0 },
  party: { fontSize: 14.5, fontWeight: "800", color: T.ink },
  sub: { fontSize: 11.5, fontWeight: "600", color: T.muted, marginTop: 2 },
  qtyBox: {
    alignItems: "flex-end",
    backgroundColor: T.sub,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.hair,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qtyNum: { fontSize: 15, fontWeight: "900", color: T.pd },
  qtyUnit: { fontSize: 10, fontWeight: "800", color: T.muted, letterSpacing: 0.4 },
  rowFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: T.hair,
    paddingTop: 10,
  },
  chips: { flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  prpChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.alt,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  prpChipText: { fontSize: 10.5, color: T.nav, fontWeight: "800" },
  itemsBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: `${T.copper}14`,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  itemsBadgeText: { fontSize: 10.5, color: T.copper, fontWeight: "800" },
  buttonContainer: { flexDirection: "row", gap: 8 },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.bg,
    gap: 10,
  },
  loadingText: { fontSize: 13, fontWeight: "700", color: T.muted },

  // Detail panel
  fullModalHeaderActions: { flexDirection: "row", gap: 8 },
  fullModalScroll: { flex: 1 },
  fullModalContent: { padding: 14, paddingBottom: 40, gap: 12 },

  sectionCard: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    gap: 10,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: T.nav,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailRow: {
    backgroundColor: T.sub,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.hair,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  detailFull: { width: "100%" },
  detailHalf: { flexGrow: 1, flexBasis: "40%", minWidth: 0 },
  detailKey: {
    fontSize: 10,
    fontWeight: "800",
    color: T.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailVal: {
    fontSize: 13.5,
    color: T.ink,
    fontWeight: "700",
    marginTop: 2,
  },

  // Item card (one per item, contains its own design table)
  itemCard: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: T.surface,
  },
  itemCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: T.sub,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  itemNo: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: T.nav,
    alignItems: "center",
    justifyContent: "center",
  },
  itemNoText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  itemCardTitle: { fontSize: 13.5, fontWeight: "800", color: T.ink },
  itemCardMeta: {
    fontSize: 11,
    color: T.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  itemCardBody: { padding: 10 },

  // Item-level info strip (item_rate / item_qty / item_unit / item_remark)
  itemInfoRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemInfoCell: { flex: 1, minWidth: 0 },
  itemInfoLabel: {
    fontSize: 10,
    color: T.muted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  itemInfoValue: { fontSize: 13, color: T.ink, fontWeight: "700", marginTop: 2 },

  // Designs table (horizontally scrollable — full dsn_* detail)
  designsTable: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  designsTableHeaderRow: {
    flexDirection: "row",
    backgroundColor: T.nav,
  },
  designsHeaderCell: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#fff",
    paddingVertical: 9,
    paddingHorizontal: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  designsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: T.hair,
    backgroundColor: T.surface,
    alignItems: "center",
  },
  designsRowAlt: { backgroundColor: T.sub },
  designsCell: {
    fontSize: 12,
    color: T.ink,
    paddingVertical: 9,
    paddingHorizontal: 8,
    fontWeight: "600",
  },
  codeCell: { color: T.muted, fontWeight: "700" },
  num: { textAlign: "right" },
  newBadge: {
    backgroundColor: `${T.green}18`,
    borderWidth: 1,
    borderColor: `${T.green}40`,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    alignSelf: "flex-start",
  },
  newBadgeText: { fontSize: 9.5, fontWeight: "800", color: T.green, letterSpacing: 0.4 },
  existingBadge: {
    backgroundColor: T.alt,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    alignSelf: "flex-start",
  },
  existingBadgeText: { fontSize: 9.5, fontWeight: "800", color: T.muted, letterSpacing: 0.4 },

  noDesignText: {
    fontSize: 12,
    color: T.muted,
    fontStyle: "italic",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  noItemsText: {
    fontSize: 12.5,
    color: T.muted,
    fontStyle: "italic",
    paddingVertical: 4,
  },
});
