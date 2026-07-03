import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChatApi } from '@/api/services';
import { Conversation } from '@/api/types';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { colors, font, radius, spacing } from '@/theme';

export default function ChatList() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Conversation[]>([]);

  useFocusEffect(
    useCallback(() => {
      ChatApi.conversations()
        .then((d) => setItems(d.results ?? []))
        .catch(() => setItems([]));
    }, []),
  );

  return (
    <Screen>
      {items.length === 0 ? (
        <Text style={styles.muted}>{t('chat.empty')}</Text>
      ) : (
        items.map((c) => {
          const other = user?.role === 'cooperative' ? c.buyer_name : c.cooperative_name;
          return (
            <Pressable key={c.id} onPress={() => router.push(`/chat/${c.id}`)}>
              <Card style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{other?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{other}</Text>
                  <Text style={styles.preview} numberOfLines={1}>{c.last_message?.message ?? ''}</Text>
                </View>
                {c.unread_count > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{c.unread_count}</Text>
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 46, height: 46, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: font.lg },
  name: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  preview: { color: colors.textMuted, fontSize: font.sm },
  badge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: colors.white, fontSize: font.xs, fontWeight: '800' },
});
