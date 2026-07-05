import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { apiError } from '@/api/api';
import { AlertsApi, COFFEE_TYPES, PRICE_TYPES } from '@/api/services';
import { PriceAlert } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { colors, font, spacing } from '@/theme';

export default function Alerts() {
  return (
    <RequireAuth>
      <AlertsScreen />
    </RequireAuth>
  );
}

function AlertsScreen() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [coffeeType, setCoffeeType] = useState('red_bourbon');
  const [priceType, setPriceType] = useState('farmgate');
  const [direction, setDirection] = useState('above');
  const [threshold, setThreshold] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await AlertsApi.list();
      setAlerts(data.results ?? []);
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setError('');
    if (!threshold || isNaN(Number(threshold))) {
      setError('Enter a valid threshold amount.');
      return;
    }
    setSaving(true);
    try {
      await AlertsApi.create({ coffee_type: coffeeType, price_type: priceType, direction, threshold: Number(threshold) });
      setThreshold('');
      load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    await AlertsApi.remove(id);
    load();
  };

  return (
    <Screen>
      <Card>
        <Text style={styles.section}>{t('alerts.create')}</Text>
        <Segmented options={COFFEE_TYPES.map((c) => ({ value: c.value, label: c.label }))} value={coffeeType} onChange={setCoffeeType} />
        <Segmented options={PRICE_TYPES.map((p) => ({ value: p.value, label: p.label }))} value={priceType} onChange={setPriceType} />
        <Segmented
          label={t('alerts.direction')}
          options={[{ value: 'above', label: t('alerts.above') }, { value: 'below', label: t('alerts.below') }]}
          value={direction}
          onChange={setDirection}
        />
        <Field label={t('alerts.threshold')} value={threshold} onChangeText={setThreshold} keyboardType="numeric" placeholder="e.g. 2000" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={t('alerts.create')} onPress={create} loading={saving} />
      </Card>

      <Text style={styles.section}>{t('alerts.title')}</Text>
      {alerts.length === 0 ? (
        <Text style={styles.muted}>{t('alerts.empty')}</Text>
      ) : (
        alerts.map((a) => (
          <Card key={a.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{a.coffee_type_display} · {a.price_type_display}</Text>
              <Text style={styles.sub}>
                {a.direction === 'above' ? t('alerts.above') : t('alerts.below')} {Number(a.threshold).toLocaleString()}
              </Text>
            </View>
            <Pressable onPress={() => remove(a.id)} hitSlop={10}>
              <Ionicons name="trash" size={20} color={colors.danger} />
            </Pressable>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  error: { color: colors.danger, fontSize: font.sm },
  muted: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: font.sm },
});
