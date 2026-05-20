import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {fontSize, radius, spacing, tatColors} from '../utils/theme';
import {TatStatus} from '../types';

interface Props {
  status: TatStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  customLabel?: string;
}

const TatBadge: React.FC<Props> = ({
  status,
  size = 'sm',
  showIcon = true,
  customLabel,
}) => {
  const c = tatColors[status] || tatColors.not_applicable;

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: c.bg},
        isSmall ? styles.badgeSm : styles.badgeMd,
      ]}>
      {showIcon ? (
        <Text style={[styles.icon, {color: c.fg}, isSmall && {fontSize: 10}]}>
          {c.icon}
        </Text>
      ) : null}
      <Text
        style={[
          styles.text,
          {color: c.fg},
          isSmall ? {fontSize: fontSize.xs} : {fontSize: fontSize.sm},
        ]}>
        {customLabel || c.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    gap: 3,
  },
  badgeSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  icon: {fontWeight: '700', fontSize: 12},
  text: {fontWeight: '500'},
});

export default TatBadge;
