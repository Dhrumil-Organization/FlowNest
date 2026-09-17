import AppAlert from '@/common/utils/appAlert';
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import WarehouseHeader from "./components/WarehouseHeader";
import { warehouseApi } from "./services/warehouseApi";
import CartonCard from "./components/CartonCard";
import { styles, COLORS } from "./components/WarehouseStyles";
import AsyncStorage from '@/common/utils/compatibleStorage';
import { API } from "@/common/API/dynamicAPI";
import axios from "axios";

const keyOf = item => String(item?.uid || item?.UId || item?.cartonNo || item?.cartno || item?.CartNo || "");
const searchable = item => `${item?.cartonNo || ""} ${item?.cartno || ""} ${item?.ItmName || ""} ${item?.itemName || ""} ${item?.ShdName || ""} ${item?.GrdName || ""} ${item?.MerName || ""} ${item?.vouNo || ""} ${item?.vouno || ""} ${item?.PackingNo || ""}`.toLowerCase();

export default function WarehouseViewScreen({ token, navigation, route }) {
  const { criteria = {}, location = {} } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [cartons, setCartons] = useState([]);
  const [searchText, setSearchText] = useState("");
  const filteredCartons = useMemo(() => { const s = searchText.trim().toLowerCase(); return s ? cartons.filter(x => searchable(x).includes(s)) : cartons; }, [cartons, searchText]);
  const getRequestConfig = () => ({
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-platform": "mob",
    },
  });

  console.log("location", location);

  const getCurrentFinancialYear = () => {
    const d = new Date();
    const fy = d.getMonth() + 1 >= 4 ? d.getFullYear() + 1 : d.getFullYear();
    return fy.toString().substring(2);
  };

  const loadData = async () => {
    const userPtype = await AsyncStorage.getItem('user_prptype');

    try {
      setLoading(true);

      const payload = {
        prpcode: criteria.prpcode,
        strcode: criteria.strcode,
        yearno: getCurrentFinancialYear(),
        itmcode: "",
        txntype: "production_warehouse_locations",
        selectedcartons: [],
        fromlocationdetail: [location],
        tolocationdetail: [],
        action: "view",
        prptype: userPtype
      };

      console.log("assign save payload", payload);

      const res = await axios.post(
        `${API}/api/prodwarehousemanage`,
        payload,
        getRequestConfig()
      );

      console.log("response", res);

      const rows = res?.data?.data || res?.data?.results || [];

      setCartons(Array.isArray(rows) ? rows : []);
    } catch (e) {
      AppAlert.alert(
        "Error",
        e?.response?.data?.message || e?.response?.data?.error ||
        e?.message ||
        "Failed to save assign"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [])

  return (
    <View style={styles.screen}>
      <WarehouseHeader title="View Carton" navigation={navigation} />
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.between}><Text style={styles.label}>Location</Text><Text style={{ color: "#000", fontWeight: "900" }}>{location.locationName || location.location}</Text></View>
          <View style={styles.between}><Text style={styles.label}>Capacity</Text><Text style={{ color: "#000", fontWeight: "900" }}>{location.used || location.occupancy || 0} / {location.capacity || 0}</Text></View>
          {/* <TouchableOpacity style={styles.button} onPress={loadData}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>LOAD DATA</Text>}
          </TouchableOpacity> */}
        </View>
        <TextInput style={[styles.input, { marginBottom: 10 }]} value={searchText} onChangeText={setSearchText} placeholder="Search carton / item / shade / voucher" />
        <Text style={styles.sectionTitle}>
          Carton List ({filteredCartons.length})
        </Text>
        {
          loading ? (

            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 80,
              }}
            >
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
              />

              <Text
                style={{
                  marginTop: 12,
                  color: "#000",
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                Loading cartons...
              </Text>
            </View>
          ) : (
            <FlatList data={filteredCartons}
              keyExtractor={(item, index) =>
                `${index}_${item?.uid || ""}_${item?.cartno || ""}`
              }
              renderItem={({ item }) => (
                <View style={{ pointerEvents: "none" }}>
                  <CartonCard
                    item={item}
                    readonly
                    hideCheckbox
                  />
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No cartons available</Text>} />

          )
        }
      </View>
    </View>
  );
}
