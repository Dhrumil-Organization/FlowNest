import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// import CatalogScreen from "../screens/CatalogScreen";

import CatalogScreen from "./screens/CatalogScreen";
import MainFormScreen from "./screens/MainFormScreen";
// import ColorwayFormScreen from "./screens/ColorwayFormScreen";
const Stack = createNativeStackNavigator();

const DesignCreationModule = props => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Catalog"
    >
      <Stack.Screen name="Catalog">
        {(screenProps) => (
          <CatalogScreen
            {...screenProps}
            token={props.token}
            isConnected={props.isConnected}
            username={props.username}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Design">
        {(screenProps) => (
          <MainFormScreen
            {...screenProps}
            token={props.token}
            isConnected={props.isConnected}
            username={props.username}
          />
        )}
      </Stack.Screen>

      {/* <Stack.Screen name="Colourway">
        {(screenProps) => (
          <ColorwayFormScreen
            {...screenProps}
            token={props.token}
            isConnected={props.isConnected}
            username={props.username}
          />
        )}
      </Stack.Screen>       */}
    </Stack.Navigator>
  );
}
export default DesignCreationModule;