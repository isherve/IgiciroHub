import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AuthApi } from '@/api/services';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { GuestBanner } from '@/components/GuestBanner';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { useAuth } from '@/context/AuthContext';
import { isAdmin, isCooperative } from '@/lib/permissions';
import { LANGUAGES, setLanguage } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, isGuest, logout, setUserLocal } = useAuth();

  const [lang, setLang] = useState(i18n.language);

  const changeLang = async (code: string) => {
    setLang(code);
    await setLanguage(code);
    if (user) {
      const updated = { ...user, locale: code };
      await setUserLocal(updated);
      AuthApi.updateMe({ locale: code }).catch(() => {});
    }
  };

  const toggle = async (key: 'notify_in_app' | 'notify_email' | 'notify_sms', value: boolean) => {
    if (!user) return;
    const updated = { ...user, [key]: value };
    await setUserLocal(updated);
    AuthApi.updateMe({ [key]: value }).catch(() => {});
  };

  const links = user && !isGuest
    ? ([
        ...(isCooperative(user) ? [{ label: t('cooperative.title'), icon: 'business' as const, route: '/cooperative' }] : []),
        ...(isAdmin(user) ? [{ label: t('admin.title'), icon: 'shield-checkmark' as const, route: '/admin' }] : []),
        { label: t('notifications.title'), icon: 'notifications', route: '/notifications' },
        { label: t('chat.title'), icon: 'chatbubbles', route: '/chat' },
        { label: t('alerts.title'), icon: 'alarm', route: '/alerts' },
        { label: t('assistant.title'), icon: 'sparkles', route: '/assistant' },
      ] as const)
    : [];

  return (
    <Screen>
      <Text style={styles.title}>{t('profile.title')}</Text>
      {isGuest && <GuestBanner />}

      <Card style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={30} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.full_name ?? 'Guest'}</Text>
          <Text style={styles.sub}>{user?.email ?? 'Browsing as guest'}</Text>
          {user ? <Text style={styles.roleBadge}>{user.role}</Text> : isGuest ? <Text style={styles.roleBadge}>{t('guest.role')}</Text> : null}
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>{t('profile.language')}</Text>
        <Segmented
          options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
          value={lang}
          onChange={changeLang}
        />
      </Card>

      {user && (
        <Card>
          <Text style={styles.section}>{t('profile.notifications')}</Text>
          <Row label={t('profile.inApp')} value={!!user.notify_in_app} onChange={(v) => toggle('notify_in_app', v)} />
          <Row label={t('profile.email')} value={!!user.notify_email} onChange={(v) => toggle('notify_email', v)} />
          <Row label={t('profile.sms')} value={!!user.notify_sms} onChange={(v) => toggle('notify_sms', v)} />
        </Card>
      )}

      {links.length > 0 && (
      <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
        {links.map((l) => (
          <Pressable key={l.label} style={styles.linkRow} onPress={() => router.push(l.route as any)}>
            <Ionicons name={l.icon as any} size={20} color={colors.primary} />
            <Text style={styles.linkText}>{l.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </Card>
      )}

      {user ? (
        <Button title={t('profile.logout')} variant="outline" onPress={() => { logout(); router.replace('/'); }} />
      ) : (
        <Button title={t('auth.login')} onPress={() => router.replace('/')} />
      )}
    </Screen>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.linkText}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} thumbColor={colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: font.sm },
  roleBadge: { color: colors.primary, fontSize: font.xs, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  section: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  linkText: { color: colors.text, fontSize: font.md, flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
});
