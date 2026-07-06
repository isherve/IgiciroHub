import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { apiError } from '@/api/api';
import { ChatApi, CropsApi } from '@/api/services';
import { CropListing } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { GuestBanner } from '@/components/GuestBanner';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { canOrderOrChat } from '@/lib/permissions';
import { colors, font, spacing } from '@/theme';

export default function ProductDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isGuest } = useAuth();

  const [listing, setListing] = useState<CropListing | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    CropsApi.get(Number(id)).then(setListing).catch(() => setListing(null));
  }, [id]);

  const contact = async () => {
    if (!listing) return;
    if (!user || isGuest) {
      router.push('/');
      return;
    }
    setSending(true);
    setError('');
    const defaultMsg =
      message.trim() ||
      `Hello, I am interested in your ${listing.coffee_type_display} ${listing.grade_display} listed at ${Number(listing.price_per_kg).toLocaleString()} ${listing.currency}/kg. Is it still available? I would like to discuss quantity and delivery options.`;
    try {
      const convo = await ChatApi.start(listing.cooperative, defaultMsg);
      router.push({
        pathname: `/chat/${convo.id}`,
        params: {
          seller: listing.cooperative_name,
          about: `${listing.coffee_type_display} ${listing.grade_display}`.toUpperCase(),
          price: `${Number(listing.price_per_kg).toLocaleString()} ${listing.currency}/kg`,
        },
      });
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSending(false);
    }
  };

  if (!listing) {
    return (
      <Screen>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  const isOwner = user?.id === listing.cooperative_owner;

  const canContact = canOrderOrChat(user, isGuest);

  return (
    <Screen>
      {isGuest && <GuestBanner />}
      <Card>
        <Text style={styles.name}>{listing.coffee_type_display}</Text>
        <Text style={styles.sub}>{listing.grade_display} · {listing.quantity_kg} kg available</Text>
        <Text style={styles.price}>{Number(listing.price_per_kg).toLocaleString()} {listing.currency}{t('market.perKg')}</Text>
        <View style={styles.divider} />
        <Text style={styles.label}>Cooperative</Text>
        <Text style={styles.value}>{listing.cooperative_name}</Text>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{listing.location || '—'}</Text>
        {listing.description ? (
          <>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{listing.description}</Text>
          </>
        ) : null}
      </Card>

      {!isOwner && canContact && (
        <Card>
          <Text style={styles.label}>{t('market.messageSeller')}</Text>
          <Field placeholder={t('chat.typeMessage')} value={message} onChangeText={setMessage} multiline />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={t('market.messageSeller')} onPress={contact} loading={sending} />
        </Card>
      )}

      {!isOwner && !canContact && (
        <Card>
          <Text style={styles.label}>{t('market.messageSeller')}</Text>
          <Text style={styles.muted}>{t('guest.loginToOrder')}</Text>
          <Button title={t('auth.login')} onPress={() => router.push('/')} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  sub: { color: colors.textMuted, fontSize: font.md },
  price: { color: colors.accent, fontSize: font.xl, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  label: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600', marginTop: spacing.xs },
  value: { color: colors.text, fontSize: font.md },
  muted: { color: colors.textMuted },
  error: { color: colors.danger, fontSize: font.sm },
});
