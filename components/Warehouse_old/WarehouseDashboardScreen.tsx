import React, { useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

import WarehouseCard from "./components/WarehouseCard";
import WarehouseActionSheet from "./WarehouseActionSheet";
import { styles, COLORS } from "./components/WarehouseStyles";

export default function WarehouseDashboardScreen({ navigation, route }) {
  const criteria = route.params?.criteria || {};
  const dashboardData = route.params?.dashboardData || [];

  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState(dashboardData);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

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
    <View style={localStyles.screen}>
      <View style={localStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Icon name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>

        <Text style={localStyles.headerTitle}>WareHouse</Text>

        <TouchableOpacity activeOpacity={0.8}>
          <Icon name="notifications-none" size={25} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && locations.length === 0 ? (
        <View style={localStyles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item, index) =>
            String(item.locationCode || item.locationName || item.location || index)
          }
          numColumns={2}
          contentContainerStyle={localStyles.listContainer}
          columnWrapperStyle={localStyles.columnWrapper}
          refreshControl={<RefreshControl refreshing={loading} />}
          renderItem={({ item }) => (
            <WarehouseCard item={item} onMenu={openMenu} />
          )}
          ListEmptyComponent={
            <Text style={localStyles.emptyText}>No warehouse location found</Text>
          }
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

const localStyles = {
  screen: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },

  header: {
    height: 64,
    backgroundColor: "#0f8f9a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    elevation: 4,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900",
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  listContainer: {
    padding: 14,
    paddingBottom: 90,
  },

  columnWrapper: {
    justifyContent: "space-between",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748b",
    fontWeight: "700",
  },
};