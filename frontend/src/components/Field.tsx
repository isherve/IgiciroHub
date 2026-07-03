import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, font, radius, spacing } from '@/theme';

type Props = TextInputProps & { label?: string; error?: string };

export function Field({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, !!error && styles.inputError, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    fontSize: font.md,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: font.xs },
});
