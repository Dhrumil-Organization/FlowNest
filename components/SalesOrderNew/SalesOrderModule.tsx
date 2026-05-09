import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SalesOrderNew from './SalesOrderNew';
import PartyListScreen from './PartyListScreen';
import OrderSummaryScreen from './OrderSummaryScreen';

import { SalesOrderProvider } from './SalesOrderContext';
import SalesOrderItemList from './SalesOrderItemList';
import SalesOrderDesignList from './SalesOrderDesignList';
import SalesOrderShadeList from './SalesOrderShadeList';


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
                <Stack.Screen name="SalesOrderItemList">
                    {screenProps => (
                        <SalesOrderItemList
                            {...screenProps}
                            token={props.token}
                            isConnected={props.isConnected}
                            username={props.username}
                        />
                    )}
                </Stack.Screen>
                <Stack.Screen name="SalesOrderDesignList">
                    {screenProps => (
                        <SalesOrderDesignList
                            {...screenProps}
                            token={props.token}
                            isConnected={props.isConnected}
                            username={props.username}
                        />
                    )}
                </Stack.Screen>
                <Stack.Screen name="SalesOrderShadeList">
                    {screenProps => (
                        <SalesOrderShadeList
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