// App.js — Root navigation setup
// Install: npm install @react-navigation/native @react-navigation/native-stack
//          npm install react-native-screens react-native-safe-area-context
//          npm install react-native-svg   (for charts)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainDashboardScreen    from './rn-app/screens/MainDashboardScreen';
import SalesExecDashboardScreen from './rn-app/screens/SalesExecDashboardScreen';
import PartyDashboardScreen   from './rn-app/screens/PartyDashboardScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}  // We use custom headers
        initialRouteName="MainDashboard"
      >
        {/* ─── Main (tabs: Owner / My View) ─── */}
        <Stack.Screen
          name="MainDashboard"
          component={MainDashboardScreen}
        />

        {/* ─── Sales Exec drill-down ─── */}
        {/* Opened by tapping exec row in Owner Dashboard (collection or outstanding) */}
        <Stack.Screen
          name="SalesExecDashboard"
          component={SalesExecDashboardScreen}
          options={{ animation: 'slide_from_right' }}
        />

        {/* ─── Party drill-down ─── */}
        {/* Opened by tapping party row in SalesExecDashboard */}
        <Stack.Screen
          name="PartyDashboard"
          component={PartyDashboardScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
