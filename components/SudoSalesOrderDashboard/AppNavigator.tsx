import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

// import HomeScreen from './screen/HomeScreen';
import DesignsScreen from './screen//DesignsScreen';
import CostingScreen from './screen//CostingScreen';
// import OrdersScreen from './screen//OrdersScreen';
import StockScreen from './screen//StockScreen';
import ExpenseScreen from './screen//ExpenseScreen';
// import ProdScreen from './screen//ProdScreen';

const TABS = [
  // { id: 'home', label: 'Home', Screen: HomeScreen },
  // { id: 'designs', label: 'Designs', Screen: DesignsScreen },
  // { id: 'costing', label: 'Costing', Screen: CostingScreen },
  // { id: 'orders', label: 'Orders', Screen: OrdersScreen },
  { id: 'stock', label: 'Stock', Screen: StockScreen },
  { id: 'expense', label: 'Expense', Screen: ExpenseScreen },
  // { id: 'prod', label: 'Prod', Screen: ProdScreen },
];

function TabIcon({ label, active }) {
  return (
    <Text
      style={{
        fontSize: 16,
        fontWeight: '600',
        color: active ? '#c2823a' : '#9ca3af',
      }}
    >
      {label.charAt(0)}
    </Text>
  );
}

export default function AppNavigator({ token, apiBase }) {
  const [activeTab, setActiveTab] = useState('expense');

  const ActiveScreen =
    TABS.find(t => t.id === activeTab)?.Screen || ExpenseScreen;

  return (
    <View style={styles.root}>
      {/* Screen Area */}
      <View style={styles.screenArea}>
        <ActiveScreen
          token={token}
          apiBase={apiBase}
          isActive={true}
        />
      </View>

      {/* Bottom Navigation */}
      <View style={styles.navbar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.navItem}
              onPress={() => setActiveTab(tab.id)}
            >
              {isActive && <View style={styles.activeDot} />}

              <TabIcon
                label={tab.label}
                active={isActive}
              />

              <Text
                style={[
                  styles.navLabel,
                  {
                    color: isActive
                      ? '#c2823a'
                      : '#9ca3af',
                    fontWeight: isActive
                      ? '700'
                      : '400',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8f7f4',
  },

  screenArea: {
    flex: 1,
  },

  navbar: {
    height: 60,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeDot: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 3,
    backgroundColor: '#c2823a',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },

  navLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});