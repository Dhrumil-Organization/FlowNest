import React from 'react';
import { Platform, StatusBar, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import CriteriaScreen from './CriteriaScreen';
import FebricStockListScreen from './FebricStockListScreen';
// import YarnStockDetailScreen from './YarnStockDetailScreen';
import NewCartonScreen from './NewCartonScreen';

const Stack = createNativeStackNavigator();

const HEADER_COLOR = '#13879A';

const FebricStockVerificationModule = props => {
  const insets = useSafeAreaInsets();

  const commonProps = {
    token: props.token,
    isConnected: props.isConnected,
    username: props.username,
    userid: props.userid,
    getUserPrptype: props.getUserPrptype,
  };

  return (
    <SafeAreaView
      style={styles.safeRoot}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        translucent={false}
        backgroundColor={HEADER_COLOR}
        barStyle="light-content"
      />

      <View
        style={[
          styles.stackWrapper,
          {
            paddingBottom:
              Platform.OS === 'android'
                ? insets.bottom
                : 0,
          },
        ]}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: styles.screenContent,
            animation: 'slide_from_right',
          }}
        >
          {/* Criteria Screen */}

          <Stack.Screen name="CriteriaScreen">
            {screenProps => (
              <CriteriaScreen
                {...screenProps}
                {...commonProps}
              />
            )}
          </Stack.Screen>

          {/* Stock Browser */}

          <Stack.Screen name="FebricStockListScreen">
            {screenProps => (
              <FebricStockListScreen
                {...screenProps}
                {...commonProps}
              />
            )}
          </Stack.Screen>

          {/* Card Detail */}

          <Stack.Screen name="YarnStockDetailScreen">
            {screenProps => (
              <YarnStockDetailScreen
                {...screenProps}
                {...commonProps}
              />
            )}
          </Stack.Screen>

          {/* New Carton */}

          <Stack.Screen name="NewCartonScreen">
            {screenProps => (
              <NewCartonScreen
                {...screenProps}
                {...commonProps}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: HEADER_COLOR,
  },

  stackWrapper: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },

  screenContent: {
    backgroundColor: '#F4F7FC',
  },
});

export default FebricStockVerificationModule;