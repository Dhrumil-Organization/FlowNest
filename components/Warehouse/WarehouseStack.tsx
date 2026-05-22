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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WarehouseCriteriaScreen">{screenProps => <WarehouseCriteriaScreen {...screenProps} token={props.token} isConnected={props.isConnected} username={props.username} />}</Stack.Screen>
      <Stack.Screen name="WarehouseDashboard" component={WarehouseDashboardScreen} />
      <Stack.Screen name="WarehouseAssign">{screenProps => <WarehouseAssignScreen {...screenProps} token={props.token} isConnected={props.isConnected} username={props.username} />}</Stack.Screen>
      <Stack.Screen name="WarehouseTransfer">{screenProps => <WarehouseTransferScreen {...screenProps} token={props.token} isConnected={props.isConnected} username={props.username} />}</Stack.Screen>
      <Stack.Screen name="WarehouseView">{screenProps => <WarehouseViewScreen {...screenProps} token={props.token} isConnected={props.isConnected} username={props.username} />}</Stack.Screen>
      <Stack.Screen name="WarehouseQRScanner" component={WarehouseQRScanner} />
    </Stack.Navigator>
  );
};

export default WarehouseStack;
