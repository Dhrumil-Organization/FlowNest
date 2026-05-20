import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, fontSize, spacing} from '../utils/theme';

interface Props {
  title: string;
  subtitle?: string;
}

const EmptyState: React.FC<Props> = ({title, subtitle}) => (
  <View style={styles.wrap}>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', padding: spacing.xxl},
  title: {fontSize: fontSize.lg, fontWeight: '500', color: colors.textPrimary},
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default EmptyState;
