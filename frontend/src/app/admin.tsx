import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { AnalyticsApi } from '@/api/services';
import { AnalyticsOverview } from '@/api/types';
import { Card } from '@/components/Card';
import { RequireAdmin } from '@/components/RequireAdmin';
import { Screen } from '@/components/Screen';
import { colors, font, spacing } from '@/theme';

export default function AdminOverview() {
  return (
    <RequireAdmin>
      <AdminScreen />
    </RequireAdmin>
  );
}

function AdminScreen() {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsOverview | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await AnalyticsApi.overview());
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <Text style={styles.title}>{t('admin.title')}</Text>
      <Text style={styles.sub}>{t('admin.subtitle')}</Text>

      {!data ? (
        <Text style={styles.muted}>{t('common.loading')}</Text>
      ) : (
        <>
          <Card>
            <Text style={styles.section}>{t('dashboard.systemOverview')}</Text>
            <Text style={styles.row}>Cooperatives: {data.counts.cooperatives}</Text>
            <Text style={styles.row}>Buyers: {data.counts.buyers}</Text>
            <Text style={styles.row}>Listings: {data.counts.listings}</Text>
            <Text style={styles.row}>Predictions: {data.counts.predictions}</Text>
            <Text style={styles.row}>Messages: {data.counts.messages}</Text>
            <Text style={styles.row}>Price records: {data.counts.price_records}</Text>
            <Text style={styles.row}>Active alerts: {data.counts.active_alerts}</Text>
          </Card>

          <Card>
            <Text style={styles.section}>{t('dashboard.marketSnapshot')}</Text>
            <Text style={styles.row}>
              Avg farmgate: {Math.round(data.market.avg_farmgate_rwf).toLocaleString()} RWF
            </Text>
            <Text style={styles.row}>Avg export: ${data.market.avg_export_usd.toFixed(2)}/lb</Text>
            <Text style={styles.row}>
              Coffee available: {Math.round(data.marketplace.total_kg_available).toLocaleString()} kg
            </Text>
          </Card>

          <Card>
            <Text style={styles.section}>{t('dashboard.mlInsights')}</Text>
            <Text style={styles.row}>Model accuracy: {data.prediction_summary.avg_accuracy}%</Text>
            <Text style={styles.row}>Rising predictions: {data.prediction_summary.rising}</Text>
            <Text style={styles.row}>Falling predictions: {data.prediction_summary.falling}</Text>
          </Card>

          <Text style={styles.section}>{t('dashboard.recentActivity')}</Text>
          {data.recent_activity.map((a, i) => (
            <Card key={`${a.type}-${i}`}>
              <Text style={styles.rowTitle}>{a.title}</Text>
              <Text style={styles.muted}>{a.detail}</Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  sub: { color: colors.textMuted, fontSize: font.sm, marginBottom: spacing.sm },
  section: { color: colors.text, fontSize: font.md, fontWeight: '700', marginBottom: spacing.sm },
  row: { color: colors.text, fontSize: font.sm, marginTop: 4 },
  rowTitle: { color: colors.text, fontSize: font.sm, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: font.sm },
});
