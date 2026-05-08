import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SalesOrderNew from './SalesOrderNew';
import PartyListScreen from './PartyListScreen';
import OrderSummaryScreen from './OrderSummaryScreen';

import { SalesOrderProvider } from './SalesOrderContext';

const Stack = createNativeStackNavigator();

const SalesOrderModule = props => {

    return (
        <SalesOrderProvider>

            <Stack.Navigator screenOptions={{ headerShown: false }}>

                <Stack.Screen name="SalesOrderBrowse">
                    {(screenProps) => (
                        <SalesOrderNew
                            {...screenProps}
                            token={props.token}
                            isConnected={props.isConnected}
                            username={props.username}
                        />
                    )}
                </Stack.Screen>

                <Stack.Screen name="PartyListScreen">
                    {(screenProps) => (
                        <PartyListScreen
                            {...screenProps}
                            token={props.token}
                            isConnected={props.isConnected}
                            username={props.username}
                        />
                    )}
                </Stack.Screen>

                <Stack.Screen name="OrderSummaryScreen">
                    {(screenProps) => (
                        <OrderSummaryScreen
                            {...screenProps}
                            token={props.token}
                            isConnected={props.isConnected}
                            username={props.username}
                        />
                    )}
                </Stack.Screen>

            </Stack.Navigator>

        </SalesOrderProvider>
    );
};

export default SalesOrderModule;