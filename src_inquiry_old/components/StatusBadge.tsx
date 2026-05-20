import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {fontSize, radius, spacing, statusColors} from '../utils/theme';

interface Props {
  status: string;
  label?: string;
}

const StatusBadge: React.FC<Props> = ({status, label}) => {
  const c = statusColors[status] || {
    bg: '#eee',
    fg: '#333',
    label: status,
  };
  return (
    <View style={[styles.badge, {backgroundColor: c.bg}]}>
      <Text style={[styles.text, {color: c.fg}]}>{label || c.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {fontSize: fontSize.xs, fontWeight: '500'},
});

export default StatusBadge;
