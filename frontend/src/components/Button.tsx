import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, font, radius, spacing } from '@/theme';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const bg = {
    primary: colors.primary,
    accent: colors.accent,
    outline: 'transparent',
    ghost: 'transparent',
  }[variant];

  const borderColor = variant === 'outline' ? colors.border : 'transparent';
  const textColor = variant === 'outline' || variant === 'ghost' ? colors.text : colors.white;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  text: { fontSize: font.md, fontWeight: '700' },
});
