import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { apiError } from '@/api/api';
import { COFFEE_TYPES, PRICE_TYPES, PredictApi, PricesApi } from '@/api/services';
import { PredictionResult } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PriceChart } from '@/components/PriceChart';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { API_BASE } from '@/config';
import { cacheGet, cacheSet, getAccess } from '@/lib/storage';
import { colors, font, radius, spacing } from '@/theme';

export default function Predict() {
  const { t } = useTranslation();
  const router = useRouter();

  const [months, setMonths] = useState(12);
  const [coffeeType, setCoffeeType] = useState('red_bourbon');
  const [priceType, setPriceType] = useState('farmgate');
  const [horizon, setHorizon] = useState(30);

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const chartWidth = Dimensions.get('window').width - spacing.lg * 2 - spacing.lg * 2;

  const run = async () => {
    setError('');
    setLoading(true);
    try {
      const [pred, hist] = await Promise.all([
        PredictApi.predict({
          coffee_type: coffeeType,
          price_type: priceType,
          historical_period: months,
          prediction_horizon: horizon,
        }),
        PricesApi.history({ coffee_type: coffeeType, price_type: priceType, months }),
      ]);
      const values = hist.map((h) => Number(h.market_price));
      setResult(pred);
      setHistory(values);
      setCachedAt(null);
      await cacheSet('lastPrediction', { pred, values });
    } catch (e) {
      const cached = await cacheGet<{ pred: PredictionResult; values: number[] }>('lastPrediction');
      if (cached) {
        setResult(cached.value.pred);
        setHistory(cached.value.values);
        setCachedAt(cached.ts);
        setError('Showing your last saved prediction (offline).');
      } else {
        setError(apiError(e, 'Prediction failed. Is the server running?'));
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const token = await getAccess();
      const url = `${API_BASE}/reports/prediction/${result.id}/`;
      const fileUri = `${FileSystem.cacheDirectory}igicirohub_prediction_${result.id}.pdf`;
      const res = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf' });
      }
    } catch (e) {
      setError(apiError(e, 'Could not download report.'));
    } finally {
      setDownloading(false);
    }
  };

  const up = result ? result.change_pct >= 0 : true;
  const currency = result?.currency ?? (priceType === 'export' ? 'USD' : 'RWF');

  return (
    <Screen>
      <Text style={styles.title}>{t('predict.title')}</Text>

      <Segmented
        label={t('predict.step1')}
        options={[3, 6, 12].map((m) => ({ value: m, label: `${m} ${t('predict.months')}` }))}
        value={months}
        onChange={setMonths}
      />
      <Segmented
        label={t('predict.step2')}
        options={COFFEE_TYPES.map((c) => ({ value: c.value, label: c.label }))}
        value={coffeeType}
        onChange={setCoffeeType}
      />
      <Segmented
        label={t('predict.step3')}
        options={PRICE_TYPES.map((p) => ({ value: p.value, label: p.label }))}
        value={priceType}
        onChange={setPriceType}
      />
      <Segmented
        label={t('predict.horizon')}
        options={[7, 14, 30].map((d) => ({ value: d, label: `${d} ${t('predict.days')}` }))}
        value={horizon}
        onChange={setHorizon}
      />

      <Button title={t('predict.run')} onPress={run} loading={loading} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {result && (
        <>
          {cachedAt && <OfflineBanner timestamp={cachedAt} />}

          <Card>
            <View style={styles.pricesRow}>
              <View>
                <Text style={styles.muted}>{t('predict.current')}</Text>
                <Text style={styles.priceLg}>{Number(result.current_price).toLocaleString()} {currency}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: up ? colors.up : colors.down }]}>
                <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={14} color={colors.white} />
                <Text style={styles.badgeText}>{Math.abs(result.change_pct).toFixed(1)}%</Text>
              </View>
            </View>

            <Text style={styles.muted}>{t('predict.predicted')}</Text>
            <Text style={styles.priceHuge}>{Number(result.predicted_price).toLocaleString()} {currency}</Text>

            <Text style={styles.range}>
              {t('predict.range')}: {Number(result.predicted_price_low).toLocaleString()} – {Number(result.predicted_price_high).toLocaleString()} {currency}
            </Text>

            <Text style={styles.footer}>
              {t('predict.method')}: {result.algorithm_used} · {t('predict.confidence')}: {result.confidence}
              {result.accuracy_rate ? ` · ${result.accuracy_rate.toFixed(1)}%` : ''}
            </Text>
          </Card>

          <Card>
            <Text style={styles.cardTitle}>{t('predict.trend')}</Text>
            <PriceChart
              width={chartWidth}
              series={[{ label: `${result.coffee_type_display}`, color: colors.primary, values: history }]}
              band={{ low: Number(result.predicted_price_low), high: Number(result.predicted_price_high), color: colors.accent }}
            />
          </Card>

          <Card style={{ borderColor: colors.primary }}>
            <View style={styles.recHeader}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>{t('predict.recommendation')}</Text>
            </View>
            <Text style={styles.recText}>{result.recommendation}</Text>
          </Card>

          <Button title={t('predict.setAlert')} variant="outline" onPress={() => router.push('/alerts')} />
          <Button title={t('predict.downloadReport')} variant="accent" onPress={downloadReport} loading={downloading} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  error: { color: colors.warning, fontSize: font.sm },
  pricesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { color: colors.textMuted, fontSize: font.sm },
  priceLg: { color: colors.text, fontSize: font.xl, fontWeight: '700' },
  priceHuge: { color: colors.primary, fontSize: font.huge, fontWeight: '800' },
  range: { color: colors.accent, fontSize: font.md, fontWeight: '700' },
  footer: { color: colors.textMuted, fontSize: font.xs, marginTop: spacing.xs },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontWeight: '800', fontSize: font.sm },
  cardTitle: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recText: { color: colors.text, fontSize: font.md, lineHeight: 22 },
});
