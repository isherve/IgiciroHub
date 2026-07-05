import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from '@/theme';

type Item = { value: string; label: string; hint: string };

type Props = {
  options: Item[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export function PriceTypePicker({ options, value, onChange, label }: Props) {
  return (
    <View style={{ gap: spacing.sm }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.row, active && styles.rowActive]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, active && styles.titleActive]}>{opt.label}</Text>
              <Text style={styles.hint}>{opt.hint}</Text>
            </View>
            {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 56,
  },
  rowActive: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  title: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  titleActive: { color: colors.primary },
  hint: { color: colors.textMuted, fontSize: font.xs, marginTop: 2 },
});
