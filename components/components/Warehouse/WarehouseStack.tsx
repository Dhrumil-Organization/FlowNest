import HomeScreen from "@/components/HomeScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import WarehouseAssignScreen from "./WarehouseAssignScreen";
import WarehouseCriteriaScreen from "./WarehouseCriteriaScreen";
import WarehouseDashboardScreen from "./WarehouseDashboardScreen";
import WarehouseQRCameraScanner from "./WarehouseQRCameraScanner";
import WarehouseQRScanner from "./WarehouseQRScanner";
import WarehouseTransferScreen from "./WarehouseTransferScreen";
import WarehouseViewScreen from "./WarehouseViewScreen";

const Stack = createNativeStackNavigator();

const WarehouseStack = props => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WarehouseCriteriaScreen">{screenProps => <WarehouseCriteriaScreen {...screenProps} token={props.token} isConnected={props.isConnected} username={props.username} userid={props.userid}/>}</Stack.Screen>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="WarehouseDashboard" component={WarehouseDashboardScreen} />
      <Stack.Screen name="WarehouseAssign">{screenProps => <WarehouseAssignScreen {...screenProps} token={props.token} isConnected={props.isConnected} username={props.username} />}</Stack.Screen>
      <Stack.Screen name="WarehouseTransfer">{screenProps => <WarehouseTransferScreen {...screenProps} token={props.token} isConnected={props.isConnected} username={props.username} />}</Stack.Screen>
      <Stack.Screen name="WarehouseView">{screenProps => <WarehouseViewScreen {...screenProps} token={props.token} isConnected={props.isConnected} username={props.username} />}</Stack.Screen>
      <Stack.Screen name="WarehouseQRScanner" component={WarehouseQRScanner} />
      <Stack.Screen name="WarehouseQRCameraScanner" component={WarehouseQRCameraScanner} />
    </Stack.Navigator>
  );
};

export default WarehouseStack;
