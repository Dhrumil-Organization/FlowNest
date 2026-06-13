import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {colors, fontSize, radius, spacing} from '../utils/theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const Button: React.FC<Props> = ({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}) => {
  const bg =
    variant === 'primary' ? colors.primary
    : variant === 'danger' ? colors.danger
    : variant === 'outline' ? 'transparent'
    : colors.bgSecondary;

  const fg =
    variant === 'primary' || variant === 'danger' ? colors.textOnPrimary
    : colors.textPrimary;

  const border =
    variant === 'outline' ? colors.borderStrong : 'transparent';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={loading || disabled}
      style={[
        styles.btn,
        {backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : 1},
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.text, {color: fg}]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 46,
  },
  text: {
    fontSize: fontSize.base,
    fontWeight: '500',
  },
});

export default Button;
