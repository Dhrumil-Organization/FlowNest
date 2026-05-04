import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Modal,
  TextInput,
  FlatList
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialIcons";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { API } from '../../common/API/dynamicAPI';
import { fetchPropertyData } from '../../common/API/Functions';

const PartyDetailScreen = ({ route, navigation }) => {

  const party = route?.params?.party;
  const selectedProperty = route?.params?.selectedProperty;
  const selectedYear = route?.params?.selectedYear;
  const token = route?.params?.token;

  const [activeTab, setActiveTab] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const [ledgerData, setLedgerData] = useState([]);
  const [outstandingData, setOutstandingData] = useState([]);
  const [rateData, setRateData] = useState([]);
  const [billingData, setBillingData] = useState([]);
  const [getAccountSummaryData, setAccountSummaryData] = useState({});
  const tabs = ["Outstanding", "Ledger", "Rate", "Billings"];
  const [loading, setLoading] = useState(true);

  // ✅ FROM DASHBOARD
  const [selectedProp, setSelectedProp] = useState(route?.params?.selectedProperty);
  const [selectedYr, setSelectedYr] = useState(route?.params?.selectedYear);

  // ✅ FILTER STATES
  const [filterVisible, setFilterVisible] = useState(false);
  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);

  const [propertyData, setPropertyData] = useState([]);
  const [propertySearch, setPropertySearch] = useState("");

  // ✅ LOAD PROPERTY
  useEffect(() => {
    const load = async () => {
      const data = await fetchPropertyData(token);
      setPropertyData(data || []);
    };
    load();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true); // ✅ start loader
    try {
      const payload = {
        prptype: selectedProperty?.PrpOf || "",
        prpcodes: selectedProperty?.PrpCode || "",
        parcodes: party?.acccode ? [party.acccode] : [],
        yearno: selectedYear ? selectedYear.slice(-2) : "",
        mheads: [],
        sheads: [],
        contras: [],
        inverse: [],
        fromdate: "",
        todate: "",
        reportytype: 0,
        showopening: 1,
        display: 1,
        showinternal: -1,
        txntype: "mob_party_dashboard",
        rptid: 1635,
        rptaction: "get_collection_comman_rpt",
        export: "",
        grpby: "party"

      };
      console.log('PartyDetailScreen ', payload);
      console.log("Selected Year:", selectedYear);
      console.log(`${API}/api/get_report`)
      const res = await axios.post(`${API}/api/get_report`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Requested-with': 'XMLHttpRequest',
        }
      });
      console.log(res);
      if (res.data.success) {
        const data = res.data.response.data;

        setLedgerData(data.get_ledger_data || []);
        setOutstandingData(data.get_outstanding_data || []);
        setRateData(data.get_customer_rate || []);
        setBillingData(data.get_billings || []);
        setAccountSummaryData(data.account_summary || []);
      }

    } catch (e) {
      console.log("API ERROR:", e);
    } finally {
      setLoading(false); // ✅ stop loader
    }
  };

  const fullAddress = [
    party?.Address,
    party?.City,
    party?.State,
    party?.Cnty,
    party?.Zip,
  ].filter(Boolean).join(", ");

  const switchTab = (index) => {
    setActiveTab(index);
    Animated.spring(translateX, {
      toValue: index,
      useNativeDriver: false,
    }).start();
  };

  const Empty = () => (
    <Text style={{ textAlign: "center", marginTop: 30, color: '#000' }}>
      No data found
    </Text>
  );
  // ✅ SKELETON
  const SkeletonCard = () => (
    <View style={styles.outCard}>
      <View style={{ height: 12, backgroundColor: "#eee", width: "40%", marginBottom: 6, borderRadius: 6 }} />
      <View style={{ height: 14, backgroundColor: "#eee", width: "80%", marginBottom: 6, borderRadius: 6 }} />
      <View style={{ height: 12, backgroundColor: "#eee", width: "60%", borderRadius: 6 }} />
    </View>
  );

  const SkeletonSummary = () => (
    <View style={styles.card}>
      <View style={{ height: 14, backgroundColor: "#eee", width: "50%", marginBottom: 8, borderRadius: 6 }} />
      <View style={{ height: 12, backgroundColor: "#eee", width: "80%", marginBottom: 6, borderRadius: 6 }} />
      <View style={{ height: 12, backgroundColor: "#eee", width: "60%", borderRadius: 6 }} />
    </View>
  );
  // ================= LEDGER =================
  const renderLedger = (data) => {
    if (!data?.length) return <Empty />;

    return data.map((item, i) => {
      const isCredit = item.credit > 0;

      return (
        <View key={i} style={[
          styles.ledgerCard,
          { borderLeftColor: isCredit ? "#2E7D32" : "#C62828" }
        ]}>
          <View style={styles.rowBetween}>
            <Text style={styles.date}>{item.TranDate}</Text>
            <Text style={styles.ref}>{item.VouNo || item.DocNo || "-"}</Text>
          </View>

          <Text style={styles.title}>
            {item.Ptcl || "Transaction"}
          </Text>

          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.label}>Debit</Text>
              <Text style={styles.debit}> ₹{parseFloat(item.DrAmt || 0).toLocaleString()}</Text>
            </View>

            <View>
              <Text style={styles.label}>Credit</Text>
              <Text style={styles.credit}> ₹{parseFloat(item.CrAmt || 0).toLocaleString()}</Text>
            </View>

            <View>
              <Text style={styles.label}>Balance</Text>
              <Text style={styles.balance}>₹{parseFloat(item.Balance || 0).toLocaleString()}</Text>
            </View>
          </View>
        </View>
      );
    });
  };

  // ================= RATE =================
  // const renderRate = (data) => {
  //   if (!data?.length) return <Empty />;

  //   return data.map((item, i) => {
  //     const discount = item.stdrate
  //       ? (((item.stdrate - item.partyrate) / item.stdrate) * 100).toFixed(2)
  //       : 0;

  //     return (
  //       <View key={i} style={styles.rateCard}>


  //         <Text style={styles.title}>{item.QgName}</Text>

  //         <Text style={styles.sub}>
  //           {item.category || "-"} • {item.unit || "-"}
  //         </Text>

  //         <View style={styles.rowBetween}>
  //           <View>
  //             <Text style={styles.strike}> {item.Qltname}</Text>
  //           </View>

  //           <View style={styles.discountBadge}>
  //             <Text style={styles.discountText}> {item.Rate}</Text>
  //           </View>
  //         </View>

  //       </View>
  //     );
  //   });
  // };

  const renderRate = (data) => {
    if (!data?.length) return <Empty />;

    return data.map((item, i) => {

      const rate = parseFloat(item.Rate || 0);

      return (
        <View
          key={i}
          style={[
            styles.ledgerCard,
            {
              borderLeftColor: "#1976D2" // 🔥 constant blue for rate
            }
          ]}
        >
          {/* TOP ROW */}

          {/* TITLE */}
          <View style={styles.rowBetween}>
            <Text style={styles.date}>
              {item.Qltname || "-"}
            </Text>

            <Text style={styles.ref}>
              {item.QgName || "-"}
            </Text>
          </View>

          {/* RATE ROW */}
          <View style={styles.rowBetween}>

            <View>
              <Text style={styles.label}>Rate</Text>
              <Text style={styles.balance}>
                ₹ {rate.toFixed(2)}
              </Text>
            </View>

          </View>

        </View>
      );
    });
  };

  // ================= OUTSTANDING =================
  const renderOutstanding = (data) => {
    if (!data?.length) return <Empty />;

    return data.map((item, i) => {
      const debit = parseFloat(item.DrAmt || 0);
      const credit = parseFloat(item.CrAmt || 0);

      const outstanding = parseFloat(item.BalOsAmt || item.Outstanding || 0);
      const paid = credit; // usually credit = paid

      const isPaid = outstanding === 0;
      const isPartial = outstanding > 0 && paid > 0;

      return (
        <View key={i} style={styles.outCard}>

          {/* TOP ROW */}
          <View style={styles.rowBetween}>
            <Text style={styles.date}>{item.TranDate}</Text>

            <View style={styles.voucherBadge}>
              <Text style={styles.voucherText}>
                {item.VouNo || item.DocNo || "-"}
              </Text>
            </View>
          </View>

          {/* DESCRIPTION */}
          <Text style={styles.title}>
            {item.Ptcl || "Transaction"}
          </Text>

          {/* AMOUNT ROW */}
          <View style={styles.amountRow}>

            <View>
              <Text style={styles.label}>Debit</Text>
              <Text style={styles.debit}>
                ₹{debit.toLocaleString()}
              </Text>
            </View>

            <View>
              <Text style={styles.label}>Credit</Text>
              <Text style={styles.credit}>
                ₹{credit.toLocaleString()}
              </Text>
            </View>

          </View>

          {/* OUTSTANDING + PAID */}
          <View style={styles.outBottomRow}>

            <View>
              <Text style={styles.label}>Outstanding</Text>
              <Text style={styles.outstanding}>
                ₹{outstanding.toLocaleString()}
              </Text>
            </View>

            <View>
              <Text style={styles.label}>Paid</Text>
              <Text style={styles.paid}>
                ₹{paid.toLocaleString()}
              </Text>
            </View>

            {/* STATUS BADGE */}
            <View style={[
              styles.statusBadge,
              {
                backgroundColor: isPaid
                  ? "#E8F5E9"
                  : isPartial
                    ? "#FFF3E0"
                    : "#FFEBEE"
              }
            ]}>
              <Text style={{
                color: isPaid
                  ? "#2E7D32"
                  : isPartial
                    ? "#EF6C00"
                    : "#C62828",
                fontWeight: "600"
              }}>
                {isPaid
                  ? "Paid"
                  : isPartial
                    ? "Partial"
                    : "Pending"}
              </Text>
            </View>

          </View>

        </View>
      );
    });
  };

  // ================= BILLING =================
  const renderBilling = (data) => {
    if (!data?.length) return <Empty />;

    return data.map((item, i) => (
      <View key={i} style={styles.billCard}>
        <Text style={styles.title}>{item.VouNo}</Text>
        <Text style={styles.date}>{item.TranDate}</Text>
        <Text style={styles.amount}>₹ {item.DrAmt}</Text>
      </View>
    ));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F2027" }}>
      <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>

        {/* HEADER */}
        <LinearGradient colors={['#0F6C7B', '#13879A']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back-ios-new" size={18} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {party?.accountname}
          </Text>

          {/* <View style={{ width: 40 }} /> */}

          {/* ✅ FUNNEL */}
          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <Icon name="tune" size={22} color="#fff" />
          </TouchableOpacity>

        </LinearGradient>

        <ScrollView>

          {/* ✅ CHIP UI */}
          <View style={styles.chipContainer}>

            <View style={styles.chip}>
              <Icon name="business" size={14} color="#0F6C7B" />

              <Text style={styles.chipText} numberOfLines={1}>
                {selectedProp?.LngName || selectedProp?.PrpCode || "Property"}
              </Text>
            </View>

            <View style={styles.chip}>
              <Icon name="event" size={14} color="#0F6C7B" />

              <Text style={styles.chipText}>
                {selectedYr || "Year"}
              </Text>
            </View>

          </View>

          {/* PARTY CARD */}
          {loading ? (

            // 🔥 SKELETON VERSION (same layout feel)
            <View style={styles.card}>

              {/* TOP ROW */}
              <View style={styles.rowBetween}>
                <View style={{ height: 12, backgroundColor: "#eee", width: 80, borderRadius: 6 }} />
                <View style={{ height: 20, backgroundColor: "#eee", width: 60, borderRadius: 10 }} />
              </View>

              {/* NAME */}
              <View style={{ height: 16, backgroundColor: "#eee", width: "60%", marginTop: 10, borderRadius: 6 }} />

              {/* ADDRESS */}
              <View style={{ height: 12, backgroundColor: "#eee", width: "80%", marginTop: 8, borderRadius: 6 }} />

              {/* PHONE */}
              <View style={{ height: 12, backgroundColor: "#eee", width: "40%", marginTop: 8, borderRadius: 6 }} />

              {/* DIVIDER */}
              <View style={styles.divider} />

              {/* SUMMARY ROW 1 */}
              <View style={styles.summaryRow}>
                {[1, 2, 3].map(i => (
                  <View key={i} style={styles.summaryBox}>
                    <View style={{ height: 10, backgroundColor: "#eee", width: "70%", marginBottom: 4, borderRadius: 6 }} />
                    <View style={{ height: 14, backgroundColor: "#eee", width: "80%", borderRadius: 6 }} />
                  </View>
                ))}
              </View>

              {/* SUMMARY ROW 2 */}
              <View style={styles.summaryRow}>
                {[1, 2, 3].map(i => (
                  <View key={i} style={styles.summaryBox}>
                    <View style={{ height: 10, backgroundColor: "#eee", width: "70%", marginBottom: 4, borderRadius: 6 }} />
                    <View style={{ height: 14, backgroundColor: "#eee", width: "80%", borderRadius: 6 }} />
                  </View>
                ))}
              </View>

            </View>

          ) : (

            // ✅ YOUR ORIGINAL CARD (UNCHANGED)
            <View style={styles.card}>

              <View style={styles.rowBetween}>
                <Text style={styles.code}>{party?.acccode}</Text>

                <View style={styles.status}>
                  <Text style={styles.statusText}>Active</Text>
                </View>
              </View>

              <Text style={styles.name}>{party?.accountname}</Text>

              <Text style={styles.address}>
                📍 {fullAddress || "No address"}
              </Text>

              <Text style={styles.phone}>
                📞 {party?.contel || "-"}
              </Text>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Opening</Text>
                  <Text style={[
                    styles.summaryValue,
                    getAccountSummaryData?.OpeningType === "Dr"
                      ? styles.debit
                      : styles.credit
                  ]}>
                    ₹ {getAccountSummaryData?.TotalOpening?.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Debit</Text>
                  <Text style={styles.debit}>
                    ₹ {getAccountSummaryData?.TotalDr?.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Credit</Text>
                  <Text style={styles.credit}>
                    ₹ {getAccountSummaryData?.TotalCr?.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Outstanding</Text>
                  <Text style={[
                    styles.summaryValue,
                    getAccountSummaryData?.NetType === "Dr"
                      ? styles.debit
                      : styles.credit
                  ]}>
                    ₹ {getAccountSummaryData?.NetOutstanding?.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Closing</Text>
                  <Text style={[
                    styles.summaryValue,
                    getAccountSummaryData?.ClosingType === "Dr"
                      ? styles.debit
                      : styles.credit
                  ]}>
                    ₹ {getAccountSummaryData?.ClosingBalance?.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Status</Text>
                  <Text style={{
                    color: getAccountSummaryData?.Matched ? "#2E7D32" : "#C62828",
                    fontWeight: "600"
                  }}>
                    {getAccountSummaryData?.Matched ? "Matched" : "Mismatch"}
                  </Text>
                </View>
              </View>

            </View>

          )}

          {/* TABS */}
          <View style={styles.tabs}>
            {tabs.map((t, i) => (
              <TouchableOpacity key={i} style={styles.tab} onPress={() => switchTab(i)}>
                <Text style={activeTab === i ? styles.tabActive : styles.tabText}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* DATA */}
          <View style={{ padding: 12 }}>
            {loading ? (
              <>
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </>
            ) : (
              <>
                {activeTab === 0 && renderOutstanding(outstandingData)}
                {activeTab === 1 && renderLedger(ledgerData)}
                {activeTab === 2 && renderRate(rateData)}
                {activeTab === 3 && renderBilling(billingData)}
              </>
            )}
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default PartyDetailScreen;

const styles = StyleSheet.create({

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontWeight: "600",
  },

  chipContainer: {
    flexDirection: "row",
    padding: 16,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F4F6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    maxWidth: "75%",   // 🔥 important for long property
  },

  chipText: {
    marginHorizontal: 6,
    fontSize: 13,
    fontWeight: "500",
    color: "#0F2027",
    flexShrink: 1,   // 🔥 prevents overflow
  },

  card: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 14,
  },

  code: {
    color: "#1976D2",
    fontWeight: "600",
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#525252"
  },

  address: {
    color: "#777",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  status: {
    backgroundColor: "#E8F5E9",
    marginLeft: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  statusText: {
    color: "#2E7D32",
  },

  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
  },

  tab: {
    padding: 10,
  },

  tabText: {
    color: "#777",
  },

  tabActive: {
    color: "#1976D2",
    fontWeight: "700",
  },

  ledgerCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
  },

  rateCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  outCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  billCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  title: {
    fontWeight: "600",
    color: "#525252",
  },

  label: {
    fontSize: 11,
    color: "#000",
  },

  date: {
    color: "#000",
  },

  ref: {
    color: "#525252",
  },

  amount: {
    fontWeight: "700",
    color: "#000"
  },

  strike: {
    // textDecorationLine: "line-through",
  },

  price: {
    color: "#1976D2",
    fontWeight: "700",
  },

  debit: {
    color: "#C62828",
  },

  credit: {
    color: "#2E7D32",
  },

  balance: {
    color: "#1976D2",
    fontWeight: "700",
  },

  statusBadge: {
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  discountBadge: {
    backgroundColor: "#E8F5E9",
    padding: 6,
    borderRadius: 8,
  },

  discountText: {
    color: "#2E7D32",
    fontSize: 16,
  },

  activeBadge: {
    backgroundColor: "#E8F5E9",
    padding: 6,
    borderRadius: 8,
  },

  activeText: {
    color: "#2E7D32",
  },
  outCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },

  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  outBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },

  voucherBadge: {
    backgroundColor: "#EEF2F7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  voucherText: {
    fontSize: 11,
    color: "#555",
  },

  outstanding: {
    color: "#C62828",
    fontWeight: "bold",
    fontSize: 14,
  },

  paid: {
    color: "#2E7D32",
    fontWeight: "bold",
    fontSize: 14,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  phone: {
    marginTop: 4,
    color: "#555",
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  summaryBox: {
    width: "32%",
  },

  summaryLabel: {
    fontSize: 11,
    color: "#888",
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
  },
});