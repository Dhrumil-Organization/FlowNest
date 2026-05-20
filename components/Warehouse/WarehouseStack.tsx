import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WarehouseCriteriaScreen from "../screens/warehouse/WarehouseCriteriaScreen";
// import WarehouseDashboardScreen from "../screens/warehouse/WarehouseDashboardScreen";
// import WarehouseAssignScreen from "../screens/warehouse/WarehouseAssignScreen";
// import WarehouseTransferScreen from "../screens/warehouse/WarehouseTransferScreen";
// import WarehouseViewScreen from "../screens/warehouse/WarehouseViewScreen";
// import WarehouseQRScannerScreen from "../screens/warehouse/WarehouseQRScannerScreen";

const Stack = createNativeStackNavigator();

export default function WarehouseStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#4F35D9" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen
        name="WarehouseCriteria"
        component={WarehouseCriteriaScreen}
        options={{ title: "Warehouse Criteria" }}
      />

      {/* <Stack.Screen
        name="WarehouseDashboard"
        component={WarehouseDashboardScreen}
        options={{ title: "WareHouse" }}
      />

      <Stack.Screen
        name="WarehouseAssign"
        component={WarehouseAssignScreen}
        options={{ title: "Assign Carton" }}
      />

      <Stack.Screen
        name="WarehouseTransfer"
        component={WarehouseTransferScreen}
        options={{ title: "Transfer Carton" }}
      />

      <Stack.Screen
        name="WarehouseView"
        component={WarehouseViewScreen}
        options={{ title: "View Carton" }}
      />

      <Stack.Screen
        name="WarehouseQRScanner"
        component={WarehouseQRScannerScreen}
        options={{
          title: "Scan Carton QR",
          headerShown: false,
        }}
      /> */}
    </Stack.Navigator>
  );
}