import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { apiError } from '@/api/api';
import { COFFEE_TYPES, PredictApi, PricesApi } from '@/api/services';
import { PredictionResult } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PriceChart } from '@/components/PriceChart';
import { PriceTypePicker } from '@/components/PriceTypePicker';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { API_BASE } from '@/config';
import { cacheGet, cacheSet, getAccess } from '@/lib/storage';
import { colors, font, radius, spacing } from '@/theme';

const PRICE_HINTS = [
  { value: 'farmgate', label: 'Farm Gate', hint: 'Price paid to farmer' },
  { value: 'cooperative', label: 'Cooperative', hint: 'After processing' },
  { value: 'export', label: 'Export (USD)', hint: 'International price' },
];

function currentSeason() {
  const m = new Date().getMonth() + 1;
  return m >= 3 && m <= 8 ? 'A' : 'B';
}

export default function Predict() {
  return (
    <RequireAuth>
      <PredictScreen />
    </RequireAuth>
  );
}

function PredictScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [months, setMonths] = useState(6);
  const [coffeeType, setCoffeeType] = useState('red_bourbon');
  const [priceType, setPriceType] = useState('cooperative');
  const [horizon, setHorizon] = useState(7);

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [historyFarm, setHistoryFarm] = useState<number[]>([]);
  const [historyExport, setHistoryExport] = useState<number[]>([]);
  const [allPrices, setAllPrices] = useState<Record<string, { value: string; currency: string }>>({});
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const chartWidth = Dimensions.get('window').width - spacing.lg * 2 - spacing.lg * 2;

  const run = async () => {
    setError('');
    setLoading(true);
    try {
      const [pred, , histFarm, histExport, ...latest] = await Promise.all([
        PredictApi.predict({
          coffee_type: coffeeType,
          price_type: priceType,
          historical_period: months,
          prediction_horizon: horizon,
        }),
        PricesApi.history({ coffee_type: coffeeType, price_type: priceType, months }),
        PricesApi.history({ coffee_type: coffeeType, price_type: 'farmgate', months }),
        PricesApi.history({ coffee_type: coffeeType, price_type: 'export', months }),
        ...(['farmgate', 'cooperative', 'export'] as const).map((pt) =>
          PricesApi.history({ coffee_type: coffeeType, price_type: pt, months: 1 }),
        ),
      ]);

      const prices: Record<string, { value: string; currency: string }> = {};
      (['farmgate', 'cooperative', 'export'] as const).forEach((pt, i) => {
        const last = latest[i]?.[latest[i].length - 1];
        if (last) prices[pt] = { value: last.market_price, currency: last.currency };
      });

      setResult(pred);
      setHistoryFarm(histFarm.map((h) => Number(h.market_price)));
      setHistoryExport(histExport.map((h) => Number(h.market_price)));
      setAllPrices(prices);
      setCachedAt(null);
      await cacheSet('lastPrediction', { pred, histFarm, histExport, prices });
    } catch (e) {
      const cached = await cacheGet<{
        pred: PredictionResult;
        histFarm: number[];
        histExport: number[];
        prices: Record<string, { value: string; currency: string }>;
      }>('lastPrediction');
      if (cached) {
        setResult(cached.value.pred);
        setHistoryFarm(cached.value.histFarm);
        setHistoryExport(cached.value.histExport);
        setAllPrices(cached.value.prices);
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
  const season = currentSeason();
  const varietyLabel = COFFEE_TYPES.find((c) => c.value === coffeeType)?.label ?? result?.coffee_type_display;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.title}>{t('predict.title')}</Text>
          <Text style={styles.subtitle}>{t('predict.subtitle')}</Text>
        </View>
      </View>

      <Segmented
        label={t('predict.step2')}
        options={COFFEE_TYPES.map((c) => ({ value: c.value, label: c.label }))}
        value={coffeeType}
        onChange={setCoffeeType}
      />

      <PriceTypePicker
        label={t('predict.step3')}
        options={PRICE_HINTS}
        value={priceType}
        onChange={setPriceType}
      />

      <Segmented
        label={t('predict.horizon')}
        options={[7, 14, 30].map((d) => ({ value: d, label: `${d} ${t('predict.days')}` }))}
        value={horizon}
        onChange={setHorizon}
      />

      <Segmented
        label={t('predict.step1')}
        options={[3, 6, 12].map((m) => ({ value: m, label: `${m} ${t('predict.months')}` }))}
        value={months}
        onChange={setMonths}
      />

      <Pressable style={styles.predictBtn} onPress={run} disabled={loading}>
        {loading ? (
          <Text style={styles.predictBtnText}>{t('common.loading')}</Text>
        ) : (
          <>
            <Ionicons name="sparkles" size={20} color={colors.white} />
            <Text style={styles.predictBtnText}>{t('predict.run')}</Text>
          </>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {result && (
        <>
          {cachedAt && <OfflineBanner timestamp={cachedAt} />}

          <Card style={styles.resultCard}>
            <View style={styles.resultTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.variety}>{result.coffee_type_display || varietyLabel}</Text>
                <Text style={styles.meta}>
                  {t('predict.season', { season })} · {result.price_type_display} · {result.horizon_days} days forecast
                </Text>
              </View>
              <View style={[styles.confBadge, { backgroundColor: up ? colors.up : colors.down }]}>
                <Text style={styles.confText}>{result.confidence}</Text>
              </View>
            </View>

            <View style={styles.compareRow}>
              <View style={styles.compareCol}>
                <Text style={styles.compareLabel}>{t('predict.now')}</Text>
                <Text style={styles.compareValue}>
                  {Number(result.current_price).toLocaleString()} {currency}/kg
                </Text>
              </View>
              <View style={styles.arrowWrap}>
                <Ionicons name={up ? 'trending-up' : 'trending-down'} size={28} color={colors.primary} />
              </View>
              <View style={[styles.compareCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.compareLabel}>{t('predict.inDays', { days: result.horizon_days })}</Text>
                <Text style={[styles.compareValue, { color: colors.primary }]}>
                  {Number(result.predicted_price).toLocaleString()} {currency}/kg
                </Text>
              </View>
            </View>

            <View style={[styles.trendBanner, { backgroundColor: up ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
              <Text style={[styles.trendBannerText, { color: up ? colors.up : colors.down }]}>
                {up ? '+' : ''}{result.change_pct.toFixed(2)}% · {up ? t('predict.rising') : t('predict.falling')} {up ? '↑' : '↓'}
              </Text>
            </View>
          </Card>

          <Text style={styles.section}>{t('predict.allPriceTypes')}</Text>
          <View style={styles.priceGrid}>
            {(['farmgate', 'cooperative', 'export'] as const).map((pt) => {
              const p = allPrices[pt];
              const label = pt === 'export' ? t('predict.export') : pt === 'farmgate' ? t('predict.farmgate') : t('predict.cooperative');
              const icon = pt === 'export' ? 'globe-outline' : pt === 'farmgate' ? 'leaf-outline' : 'people-outline';
              return (
                <Card key={pt} style={styles.priceTile}>
                  <Ionicons name={icon as any} size={18} color={colors.primary} />
                  <Text style={styles.tileLabel}>{label}</Text>
                  <Text style={styles.tileValue}>
                    {p ? `${Number(p.value).toLocaleString()} ${p.currency}` : '—'}
                  </Text>
                </Card>
              );
            })}
          </View>

          <Card>
            <Text style={styles.cardTitle}>{t('predict.trend')}</Text>
            <Text style={styles.cardSub}>{t('predict.trendSub', { months })}</Text>
            <PriceChart
              width={chartWidth}
              series={[
                { label: 'Farm Gate (RWF/kg)', color: colors.primary, values: historyFarm },
                { label: 'Export (USD/kg)', color: '#14B8A6', values: historyExport },
              ]}
              band={{ low: Number(result.predicted_price_low), high: Number(result.predicted_price_high), color: colors.accent }}
            />
          </Card>

          <Card style={styles.seasonCard}>
            <Text style={styles.cardTitle}>{t('predict.season', { season })}</Text>
            <Text style={styles.seasonHint}>{t('predict.seasonHint')}</Text>
          </Card>

          <Card style={{ borderColor: colors.primary }}>
            <View style={styles.recHeader}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>{t('predict.recommendation')}</Text>
            </View>
            <Text style={styles.recText}>{result.recommendation}</Text>
            <Text style={styles.footer}>
              {t('predict.method')}: {result.algorithm_used} · {t('predict.confidence')}: {result.confidence}
            </Text>
          </Card>

          <Button title={t('predict.setAlert')} variant="outline" onPress={() => router.push('/alerts')} />
          <Button title={t('predict.downloadReport')} variant="accent" onPress={downloadReport} loading={downloading} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: font.xl, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: font.xs, marginTop: 2 },
  predictBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    minHeight: 56,
    marginTop: spacing.sm,
  },
  predictBtnText: { color: colors.white, fontSize: font.lg, fontWeight: '800' },
  error: { color: colors.warning, fontSize: font.sm },
  resultCard: { borderColor: colors.primary, gap: spacing.md },
  resultTop: { flexDirection: 'row', alignItems: 'flex-start' },
  variety: { color: colors.text, fontSize: font.lg, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: font.xs, marginTop: 4, textTransform: 'capitalize' },
  confBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  confText: { color: colors.white, fontWeight: '800', fontSize: font.xs, textTransform: 'uppercase' },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareCol: { flex: 1 },
  compareLabel: { color: colors.textMuted, fontSize: font.xs, fontWeight: '700' },
  compareValue: { color: colors.text, fontSize: font.md, fontWeight: '800', marginTop: 4 },
  arrowWrap: { paddingHorizontal: spacing.sm },
  trendBanner: { borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  trendBannerText: { fontWeight: '800', fontSize: font.md },
  section: { color: colors.text, fontSize: font.md, fontWeight: '700', marginTop: spacing.sm },
  priceGrid: { flexDirection: 'row', gap: spacing.sm },
  priceTile: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  tileLabel: { color: colors.textMuted, fontSize: font.xs, textAlign: 'center' },
  tileValue: { color: colors.text, fontSize: font.sm, fontWeight: '700', textAlign: 'center' },
  cardTitle: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  cardSub: { color: colors.textMuted, fontSize: font.xs, marginBottom: spacing.sm },
  seasonCard: { backgroundColor: colors.surfaceAlt },
  seasonHint: { color: colors.textMuted, fontSize: font.sm, marginTop: spacing.xs },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recText: { color: colors.text, fontSize: font.md, lineHeight: 22, marginTop: spacing.sm },
  footer: { color: colors.textMuted, fontSize: font.xs, marginTop: spacing.md },
});
