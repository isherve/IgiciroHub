import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from '@/theme';

/** Shown on browse screens when the user is in guest (view-only) mode. */
export function GuestBanner() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Ionicons name="eye-outline" size={18} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t('guest.viewOnlyTitle')}</Text>
        <Text style={styles.sub}>{t('guest.viewOnlySub')}</Text>
      </View>
      <Pressable style={styles.btn} onPress={() => router.push('/login')}>
        <Text style={styles.btnText}>{t('auth.login')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(31,174,75,0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  title: { color: colors.text, fontSize: font.sm, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: font.xs, marginTop: 2 },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  btnText: { color: colors.white, fontSize: font.xs, fontWeight: '700' },
});
