import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

import WarehouseCard from "./components/WarehouseCard";
import WarehouseActionSheet from "./WarehouseActionSheet";
import { warehouseApi } from "./services/warehouseApi";
import { styles, COLORS } from "./components/WarehouseStyles";

export default function WarehouseDashboardScreen({ navigation, route }) {
  const criteria = route.params?.criteria || {};

  const dashboardData = route.params?.dashboardData || [];

  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState(dashboardData);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  // useEffect(() => {
  //   loadDashboard();
  // }, []);

  // const loadDashboard = async () => {
  //   try {
  //     setLoading(true);

  //     const res = await warehouseApi.getDashboard(criteria);
  //     const rows = res?.data?.data || res?.data?.results || [];

  //     setLocations(Array.isArray(rows) ? rows : []);
  //   } catch (e) {
  //     Alert.alert(
  //       "Error",
  //       e?.response?.data?.message || "Failed to load warehouse dashboard"
  //     );
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const openMenu = item => {
    setSelectedLocation(item);
    setMenuVisible(true);
  };

  const closeMenu = () => setMenuVisible(false);

  const goAssign = () => {
    closeMenu();
    navigation.navigate("WarehouseAssign", {
      criteria,
      location: selectedLocation,
      mode: "ASSIGN",
    });
  };

  const goView = () => {
    closeMenu();
    navigation.navigate("WarehouseView", {
      criteria,
      location: selectedLocation,
      mode: "VIEW",
    });
  };

  const goTransfer = () => {
    closeMenu();
    navigation.navigate("WarehouseTransfer", {
      criteria,
      location: selectedLocation,
      mode: "TRANSFER",
    });
  };

  return (
    <View style={styles.screen}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon name="menu" size={26} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          WareHouse
        </Text>

        <TouchableOpacity activeOpacity={0.8}>
          <Icon name="notifications-none" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && locations.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item, index) =>
            String(item.locationCode || item.locationName || index)
          }
          numColumns={2}
          contentContainerStyle={styles.container}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          refreshControl={
            <RefreshControl refreshing={loading} 
            // onRefresh={loadDashboard} 
            />
          }
          renderItem={({ item }) => (
            <WarehouseCard item={item} onMenu={openMenu} />
          )}
        />
      )}

      <WarehouseActionSheet
        visible={menuVisible}
        item={selectedLocation}
        onClose={closeMenu}
        onAssign={goAssign}
        onView={goView}
        onTransfer={goTransfer}
      />
    </View>
  );
}