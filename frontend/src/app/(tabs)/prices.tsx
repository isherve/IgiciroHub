import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { COFFEE_TYPES, PRICE_TYPES, PricesApi } from '@/api/services';
import { CoffeePrice } from '@/api/types';
import { Card } from '@/components/Card';
import { PriceChart } from '@/components/PriceChart';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { colors, font, spacing } from '@/theme';

export default function Prices() {
  const { t } = useTranslation();
  const [coffeeType, setCoffeeType] = useState('red_bourbon');
  const [priceType, setPriceType] = useState('farmgate');
  const [history, setHistory] = useState<CoffeePrice[]>([]);
  const [loading, setLoading] = useState(false);

  const width = Dimensions.get('window').width - spacing.lg * 2 - spacing.lg * 2;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const h = await PricesApi.history({ coffee_type: coffeeType, price_type: priceType, months: 12 });
      setHistory(h);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [coffeeType, priceType]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = priceType === 'export' ? 'USD' : 'RWF';
  const values = history.map((h) => Number(h.market_price));

  return (
    <Screen>
      <Text style={styles.title}>{t('tabs.prices')}</Text>

      <Segmented
        label={t('predict.step2')}
        options={COFFEE_TYPES.map((c) => ({ value: c.value, label: c.label }))}
        value={coffeeType}
        onChange={setCoffeeType}
      />
      <Segmented
        options={PRICE_TYPES.map((p) => ({ value: p.value, label: p.label }))}
        value={priceType}
        onChange={setPriceType}
      />

      <Card>
        <Text style={styles.cardTitle}>{t('predict.trend')} · {currency}</Text>
        {loading ? (
          <Text style={styles.muted}>{t('common.loading')}</Text>
        ) : (
          <PriceChart
            width={width}
            series={[{ label: `${coffeeType} (${priceType})`, color: colors.primary, values }]}
          />
        )}
      </Card>

      <Text style={styles.section}>Recent records</Text>
      {history.slice(-10).reverse().map((h) => (
        <Card key={h.id} style={styles.row}>
          <Text style={styles.date}>{h.recorded_date}</Text>
          <Text style={styles.price}>{Number(h.market_price).toLocaleString()} {h.currency}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  cardTitle: { color: colors.text, fontSize: font.md, fontWeight: '700', textTransform: 'capitalize' },
  section: { color: colors.text, fontSize: font.lg, fontWeight: '700', marginTop: spacing.sm },
  muted: { color: colors.textMuted, paddingVertical: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  date: { color: colors.textMuted, fontSize: font.sm },
  price: { color: colors.text, fontSize: font.md, fontWeight: '700' },
});
