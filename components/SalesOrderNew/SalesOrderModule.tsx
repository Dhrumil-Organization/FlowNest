import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, StatusBar, View, StyleSheet } from 'react-native';
import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';

import SalesOrderNew from './SalesOrderNew';
import PartyListScreen from './PartyListScreen';
import OrderSummaryScreen from './OrderSummaryScreen';

import { SalesOrderProvider } from './SalesOrderContext';
import SalesOrderItemList from './SalesOrderItemList';
import SalesOrderDesignList from './SalesOrderDesignList';
import SalesOrderShadeList from './SalesOrderShadeList';
import SalesOrderDetails from './SalesOrderDetails';
import ItemAddedSuccessScreen from './ItemAddedSuccessScreen';
import SalesOrderAddAnotherShade from './SalesOrderAddAnotherShade';
import SalesOrderSaveSuccess from './SalesOrderSaveSuccess';
import PdfViewerScreen from './PdfViewerScreen';

``
const Stack = createNativeStackNavigator();


const HEADER_COLOR = '#007f95';

const SalesOrderModule = props => {
    const insets = useSafeAreaInsets();

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
                        <Stack.Screen name="SalesOrderDetails">
                            {screenProps => (
                                <SalesOrderDetails
                                    {...screenProps}
                                    token={props.token}
                                    isConnected={props.isConnected}
                                    username={props.username}
                                />
                            )}
                        </Stack.Screen>
                        <Stack.Screen name="SalesOrderAddAnotherShade">
                            {screenProps => (
                                <SalesOrderAddAnotherShade
                                    {...screenProps}
                                    token={props.token}
                                    isConnected={props.isConnected}
                                    username={props.username}
                                />
                            )}
                        </Stack.Screen>


                        {/* <Stack.Screen name="ItemAddedSuccessScreen">
                    {screenProps => (
                        <ItemAddedSuccessScreen
                            {...screenProps}
                            token={props.token}
                            isConnected={props.isConnected}
                            username={props.username}
                        />
                    )}
                </Stack.Screen> */}

                        <Stack.Screen name="SalesOrderSaveSuccess">
                            {screenProps => (
                                <SalesOrderSaveSuccess
                                    {...screenProps}
                                    token={props.token}
                                    isConnected={props.isConnected}
                                    username={props.username}
                                />
                            )}
                        </Stack.Screen>
                        <Stack.Screen name="PdfViewerScreen">
                            {screenProps => (
                                <PdfViewerScreen
                                    {...screenProps}
                                    token={props.token}
                                    isConnected={props.isConnected}
                                    username={props.username}
                                />
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

export default SalesOrderModule;