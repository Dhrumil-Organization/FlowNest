import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CriteriaScreen from './screens/CriteriaScreen';
import StockListScreen from "./screens/StockListScreen";
import StockDetailScreen from "./screens/StockDetailScreen";
import NewCartonScreen from "./screens/NewCartonScreen";
const Stack = createNativeStackNavigator();

const FebricStockVerificationModule = props => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Criteria"
    >
      <Stack.Screen name="Criteria">
        {(screenProps) => (
          <CriteriaScreen
            {...screenProps}
            token={props.token}
            isConnected={props.isConnected}
            username={props.username}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="StockList">
        {(screenProps) => (
          <StockListScreen
            {...screenProps}
            token={props.token}
            isConnected={props.isConnected}
            username={props.username}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="StockDetail">
        {(screenProps) => (
          <StockDetailScreen
            {...screenProps}
            token={props.token}
            isConnected={props.isConnected}
            username={props.username}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="NewCarton">
        {(screenProps) => (
          <NewCartonScreen
            {...screenProps}
            token={props.token}
            isConnected={props.isConnected}
            username={props.username}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
export default FebricStockVerificationModule;