import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WarehouseCriteriaScreen from "./WarehouseCriteriaScreen";
import WarehouseDashboardScreen from "./WarehouseDashboardScreen";
import WarehouseAssignScreen from "./WarehouseAssignScreen";
import WarehouseTransferScreen from "./WarehouseTransferScreen";
import WarehouseViewScreen from "./WarehouseViewScreen";
import WarehouseQRScanner from "./WarehouseQRScanner";

const Stack = createNativeStackNavigator();

const WarehouseStack = props => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* <Stack.Screen
        name="WarehouseCriteria"
        component={WarehouseCriteriaScreen}
        options={{ title: "Warehouse Criteria" }}
      /> */}

      <Stack.Screen name="WarehouseCriteriaScreen">
        {(screenProps) => (
          <WarehouseCriteriaScreen
            {...screenProps}
            token={props.token}
            isConnected={props.isConnected}
            username={props.username}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="WarehouseDashboard"
        component={WarehouseDashboardScreen}
        options={{ title: "WareHouse" }}
      />

      <Stack.Screen name="WarehouseAssign">
        {(screenProps) => (
          <WarehouseAssignScreen
            {...screenProps}
            token={props.token}
            isConnected={props.isConnected}
            username={props.username}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="WarehouseTransfer">
        {(screenProps) => (
          <WarehouseTransferScreen
            {...screenProps}
            token={props.token}
            isConnected={props.isConnected}
            username={props.username}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="WarehouseView">
        {(screenProps) => (
          <WarehouseViewScreen
            {...screenProps}
            token={props.token}
            isConnected={props.isConnected}
            username={props.username}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="WarehouseQRScanner"
        component={WarehouseQRScanner}
        options={{
          title: "Scan Carton QR",
          headerShown: false,
        }}
      />


      {/* 
<Stack.Screen
        name="WarehouseAssign"
        component={WarehouseAssignScreen}
        options={{ title: "Assign Carton" }}
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
export default WarehouseStack;