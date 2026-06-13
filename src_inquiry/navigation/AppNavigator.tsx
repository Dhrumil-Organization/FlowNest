import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {RootStackParamList} from '../types';
import {colors, fontSize} from '../utils/theme';

import DashboardScreen from '../screens/DashboardScreen';
import InquiryFormScreen from '../screens/InquiryFormScreen';
import PartySelectionScreen from '../screens/PartySelectionScreen';
import AddPartyScreen from '../screens/AddPartyScreen';
import DesignSelectionScreen from '../screens/DesignSelectionScreen';
import InquiryDetailScreen from '../screens/InquiryDetailScreen';
import CostingScreen from '../screens/CostingScreen';
import SendQuotationScreen from '../screens/SendQuotationScreen';
import ConfirmInquiryScreen from '../screens/ConfirmInquiryScreen';
import RejectInquiryScreen from '../screens/RejectInquiryScreen';
import TatConfigScreen from '../screens/TatConfigScreen';
import TatAnalyticsScreen from '../screens/TatAnalyticsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: {backgroundColor: colors.cardBg},
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontSize: fontSize.lg,
          fontWeight: '500',
        },
        headerShadowVisible: false,
        contentStyle: {backgroundColor: colors.bg},
      }}>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="InquiryForm"
        component={InquiryFormScreen}
        options={{title: 'New Inquiry'}}
      />
      <Stack.Screen
        name="PartySelection"
        component={PartySelectionScreen}
        options={{title: 'Select Party'}}
      />
      <Stack.Screen
        name="AddParty"
        component={AddPartyScreen}
        options={{title: 'Add New Party'}}
      />
      <Stack.Screen
        name="DesignSelection"
        component={DesignSelectionScreen}
        options={{title: 'Select Design'}}
      />
      <Stack.Screen
        name="InquiryDetail"
        component={InquiryDetailScreen}
        options={{title: 'Inquiry Details'}}
      />
      <Stack.Screen
        name="Costing"
        component={CostingScreen}
        options={{title: 'Add Costing'}}
      />
      <Stack.Screen
        name="SendQuotation"
        component={SendQuotationScreen}
        options={{title: 'Send Quotation'}}
      />
      <Stack.Screen
        name="ConfirmInquiry"
        component={ConfirmInquiryScreen}
        options={{title: 'Confirm Inquiry'}}
      />
      <Stack.Screen
        name="RejectInquiry"
        component={RejectInquiryScreen}
        options={{title: 'Reject Inquiry'}}
      />
      <Stack.Screen
        name="TatConfig"
        component={TatConfigScreen}
        options={{title: 'TAT Configuration'}}
      />
      <Stack.Screen
        name="TatAnalytics"
        component={TatAnalyticsScreen}
        options={{title: 'TAT Analytics'}}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
