import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { colors, font, radius, spacing } from '@/theme';

export default function Welcome() {
  const { t } = useTranslation();
  const router = useRouter();
  const { continueAsGuest } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Ionicons name="cafe" size={54} color={colors.primary} />
        </View>
        <Text style={styles.title}>{t('app.name')}</Text>
        <Text style={styles.tagline}>{t('app.tagline')}</Text>
        <Text style={styles.intro}>{t('welcome.intro')}</Text>
      </View>

      <View style={styles.actions}>
        <Button title={t('welcome.joinCoop')} onPress={() => router.push('/register?role=cooperative')} />
        <Button title={t('welcome.signIn')} variant="outline" onPress={() => router.push('/login')} />
        <Button title={t('auth.guest')} variant="ghost" onPress={() => { continueAsGuest(); router.replace('/(tabs)'); }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  logo: {
    width: 110,
    height: 110,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: font.huge, fontWeight: '800' },
  tagline: { color: colors.primary, fontSize: font.lg, fontWeight: '700', textAlign: 'center' },
  intro: { color: colors.textMuted, fontSize: font.md, textAlign: 'center', paddingHorizontal: spacing.lg },
  actions: { gap: spacing.md },
});
