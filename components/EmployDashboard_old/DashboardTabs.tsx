import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface Props {
  selectedTab: string;
  onTabChange: (
    tab: string,
  ) => void;
}

export default function DashboardTabs({ selectedTab, onTabChange }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.activeTab}
        onPress={() =>
          onTabChange('owner')
        }>
        <Text style={styles.activeText}>
          🎽 Owner
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab}
        onPress={() =>
          onTabChange('myview')
        }>
        <Text style={styles.text}>
          🙋 My View
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flexDirection: 'row',

      height: 44,

      backgroundColor:
        '#FFFFFF',
    },

    activeTab: {
      flex: 1,

      justifyContent:
        'center',

      alignItems: 'center',

      borderBottomWidth: 2,

      borderBottomColor:
        '#0A5C96',
    },

    tab: {
      flex: 1,

      justifyContent:
        'center',

      alignItems: 'center',
    },

    activeText: {
      color: '#0A5C96',

      fontWeight: '700',
    },

    text: {
      color: '#9AA3AF',

      fontWeight: '600',
    },
  });