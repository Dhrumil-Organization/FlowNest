import React, { useState, useMemo } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  StatusBar,
  TextInput,
  Keyboard,
} from "react-native";
import Icon from "@expo/vector-icons/MaterialIcons";

import WarehouseCard from "./components/WarehouseCard";
import WarehouseActionSheet from "./WarehouseActionSheet";
import { COLORS } from "./components/WarehouseStyles";

export default function WarehouseDashboardScreen({ navigation, route }) {
  const criteria = route.params?.criteria || {};
  const dashboardData = route.params?.dashboardData || [];

  const [loading] = useState(false);
  const [locations] = useState(dashboardData);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const [search, setSearch] = useState("");

  const filteredLocations = useMemo(() => {
    if (!search?.trim()) return locations;

    const searchText = search.toLowerCase();

    return locations.filter(item => {
      return Object.values(item || {}).some(value =>
        String(value || "")
          .toLowerCase()
          .includes(searchText)
      );
    });
  }, [search, locations]);

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
      <StatusBar backgroundColor="#0f8f9a" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Icon name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>WareHouse</Text>

        <TouchableOpacity activeOpacity={0.8}>
          <Icon name="notifications-none" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.mainSearchBox}>
        <Icon name="search" size={20} color="#000" />

        <TextInput
          placeholder="Search warehouse..."
          placeholderTextColor="#000"
          value={search}
          onChangeText={setSearch}
          style={styles.mainSearchInput}
          returnKeyType="search"
        />

        {search?.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearch("");
              Keyboard.dismiss();
            }}
            style={styles.clearBtn}
          >
            <Icon name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* {loading && locations.length === 0 ? ( */}
      {loading && filteredLocations.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          // data={locations}
          data={filteredLocations}
          keyExtractor={(item, index) =>
            String(item.locationCode || item.locationName || item.location || index)
          }
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={<RefreshControl refreshing={loading} />}
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

const styles = {
  screen: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },

  header: {
    height: 62,
    backgroundColor: "#0f8f9a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    elevation: 5,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  listContainer: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 90,
  },

  columnWrapper: {
    justifyContent: "space-between",
  },
  mainSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 22,
    paddingHorizontal: 18,
    height: 50,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },

  mainSearchInput: {
    flex: 1,
    height: "100%",
    color: "#000",
    fontSize: 15,
    marginLeft: 10,
  },
};