import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import {colors, fontSize, radius, spacing} from '../utils/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

const Input: React.FC<Props> = ({
  label,
  error,
  required,
  containerStyle,
  ...inputProps
}) => {
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={{color: colors.danger}}> *</Text> : null}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          inputProps.multiline ? styles.multiline : null,
          error ? {borderColor: colors.danger} : null,
        ]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {marginBottom: spacing.md},
  label: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.cardBg,
  },
  multiline: {minHeight: 80, textAlignVertical: 'top'},
  error: {color: colors.danger, fontSize: fontSize.xs, marginTop: 2},
});

export default Input;
