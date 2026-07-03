import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COFFEE_TYPES, CropsApi } from '@/api/services';
import { CropListing } from '@/api/types';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { colors, font, spacing } from '@/theme';

export default function Market() {
  const { t } = useTranslation();
  const router = useRouter();
  const [listings, setListings] = useState<CropListing[]>([]);
  const [coffeeType, setCoffeeType] = useState<string>('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const params: Record<string, unknown> = { available: 'true' };
    if (coffeeType) params.coffee_type = coffeeType;
    if (search) params.location = search;
    const data = await CropsApi.list(params);
    setListings(data.results ?? []);
  }, [coffeeType, search]);

  useEffect(() => {
    load();
  }, [load]);

  const typeOptions = [{ value: '', label: 'All' }, ...COFFEE_TYPES.map((c) => ({ value: c.value, label: c.label }))];

  return (
    <Screen>
      <Text style={styles.title}>{t('market.title')}</Text>
      <Field placeholder="Filter by location..." value={search} onChangeText={setSearch} />
      <Segmented options={typeOptions} value={coffeeType} onChange={setCoffeeType} />

      {listings.length === 0 ? (
        <Text style={styles.muted}>{t('common.empty')}</Text>
      ) : (
        listings.map((l) => (
          <Pressable key={l.id} onPress={() => router.push(`/product/${l.id}`)}>
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{l.coffee_type_display}</Text>
                  <Text style={styles.sub}>{l.grade_display} · {l.quantity_kg} kg</Text>
                  <Text style={styles.sub}>{l.cooperative_name} · {l.location}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.price}>{Number(l.price_per_kg).toLocaleString()}</Text>
                  <Text style={styles.perkg}>{l.currency}{t('market.perKg')}</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  muted: { color: colors.textMuted, paddingVertical: spacing.xl, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: font.sm },
  price: { color: colors.accent, fontSize: font.xl, fontWeight: '800' },
  perkg: { color: colors.textMuted, fontSize: font.xs },
});
