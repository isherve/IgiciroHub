import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, font, radius, spacing } from '@/theme';

export function OfflineBanner({ timestamp }: { timestamp?: number | null }) {
  const { t } = useTranslation();
  const time = timestamp ? new Date(timestamp).toLocaleString() : '';
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{t('offline.banner', { time })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  text: { color: '#1A1206', fontSize: font.xs, fontWeight: '700', textAlign: 'center' },
});
