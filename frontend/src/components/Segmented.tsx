import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from '@/theme';

type Option = { value: string | number; label: string };

type Props = {
  options: Option[];
  value: string | number;
  onChange: (value: any) => void;
  label?: string;
};

export function Segmented({ options, value, onChange, label }: Props) {
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() => onChange(opt.value)}
              style={[styles.item, active && styles.itemActive]}
            >
              <Text style={[styles.text, active && styles.textActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  item: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    minHeight: 44,
    justifyContent: 'center',
  },
  itemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.text, fontSize: font.sm, fontWeight: '600' },
  textActive: { color: colors.white },
});
