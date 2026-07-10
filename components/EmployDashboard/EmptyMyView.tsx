import React from 'react';

import {
  View,
  Text,
} from 'react-native';

export default function EmptyMyView() {
  return (
    <View
      style={{
        alignItems: 'center',
        paddingTop: 80,
      }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
        }}>
        No Data Available
      </Text>

      <Text
        style={{
          marginTop: 8,
          color: '#9CA3AF',
        }}>
        My View data not configured yet.
      </Text>
    </View>
  );
}