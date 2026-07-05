import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { AlertsApi } from '@/api/services';
import { Notification } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { colors, font, spacing } from '@/theme';

export default function Notifications() {
  return (
    <RequireAuth>
      <NotificationsScreen />
    </RequireAuth>
  );
}

function NotificationsScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await AlertsApi.notifications();
      setItems(data.results ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    await AlertsApi.markAllRead();
    load();
  };

  return (
    <Screen>
      {items.length > 0 && <Button title={t('notifications.markAllRead')} variant="outline" onPress={markAll} />}
      {items.length === 0 ? (
        <Text style={styles.muted}>{t('notifications.empty')}</Text>
      ) : (
        items.map((n) => (
          <Card key={n.id} style={[styles.card, !n.is_read && styles.unread]}>
            <Text style={styles.msg}>{n.notification_message}</Text>
            <Text style={styles.date}>{new Date(n.notification_date).toLocaleString()}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
  card: { gap: spacing.xs },
  unread: { borderColor: colors.primary },
  msg: { color: colors.text, fontSize: font.md },
  date: { color: colors.textMuted, fontSize: font.xs },
});
