import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// import YarnSalesOrder from '.';
import OrderSummaryScreen from './OrderSummaryScreen';
import PartyListScreen from './PartyListScreen';
import YarnSalesOrder from './YarnSalesOrder';

import AddNewItemScreen from './AddNewItemScreen';
import AddNewPartyScreen from './AddNewPartyScreen';
import PdfViewerScreen from './PdfViewerScreen';
import SalesOrderAddAnotherShade from './SalesOrderAddAnotherShade';
import { SalesOrderProvider } from './SalesOrderContext';
import SalesOrderDetails from './SalesOrderDetails';
import SalesOrderGradeList from './SalesOrderGradeList';
import SalesOrderItemList from './SalesOrderItemList';
import SalesOrderSaveSuccess from './SalesOrderSaveSuccess';
import SalesOrderShadeList from './SalesOrderShadeList';

const Stack = createNativeStackNavigator();

const HEADER_COLOR = '#007f95';

const YarnSalesOrderModule = props => {
  const insets = useSafeAreaInsets();

  const commonProps = {
    token: props.token,
    isConnected: props.isConnected,
    username: props.username,
    userid: props.userid
  };

  return (
    <SalesOrderProvider>
      <SafeAreaView style={styles.safeRoot} edges={['top', 'left', 'right']}>
        <StatusBar
          translucent={false}
          backgroundColor={HEADER_COLOR}
          barStyle="light-content"
        />

        <View
          style={[
            styles.stackWrapper,
            {
              paddingBottom: Platform.OS === 'android' ? insets.bottom : 0,
            },
          ]}
        >
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: styles.screenContent,
            }}
          >
            <Stack.Screen name="SalesOrderBrowse">
              {screenProps => (
                <YarnSalesOrder {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>

            <Stack.Screen name="PartyListScreen">
              {screenProps => (
                <PartyListScreen {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>

            <Stack.Screen name="OrderSummaryScreen">
              {screenProps => (
                <OrderSummaryScreen {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>

            <Stack.Screen name="SalesOrderItemList">
              {screenProps => (
                <SalesOrderItemList {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>

            <Stack.Screen name="SalesOrderGradeList">
              {screenProps => (
                <SalesOrderGradeList {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>

            <Stack.Screen name="SalesOrderShadeList">
              {screenProps => (
                <SalesOrderShadeList {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>

            <Stack.Screen name="SalesOrderDetails">
              {screenProps => (
                <SalesOrderDetails {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>

            <Stack.Screen name="SalesOrderAddAnotherShade">
              {screenProps => (
                <SalesOrderAddAnotherShade {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>

            <Stack.Screen name="SalesOrderSaveSuccess">
              {screenProps => (
                <SalesOrderSaveSuccess {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>

            <Stack.Screen name="PdfViewerScreen">
              {screenProps => (
                <PdfViewerScreen {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>

            <Stack.Screen name="AddNewPartyScreen">
              {screenProps => (
                <AddNewPartyScreen {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>

            <Stack.Screen name="AddNewItemScreen">
              {screenProps => (
                <AddNewItemScreen {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>

            <Stack.Screen name="SalesOrderBrowse">
              {screenProps => (
                <YarnSalesOrder {...screenProps} {...commonProps} />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </View>
      </SafeAreaView>
    </SalesOrderProvider>
  );
};

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: HEADER_COLOR,
  },
  stackWrapper: {
    flex: 1,
    backgroundColor: '#f4f7f9',
  },
  screenContent: {
    backgroundColor: '#f4f7f9',
  },
});

export default YarnSalesOrderModule;