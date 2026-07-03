import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { CropsApi, PricesApi } from '@/api/services';
import { CropListing, TrendingPrice } from '@/api/types';
import { Card } from '@/components/Card';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Screen } from '@/components/Screen';
import { useOffline } from '@/components/useOffline';
import { useAuth } from '@/context/AuthContext';
import { cacheGet, cacheSet } from '@/lib/storage';
import { colors, font, radius, spacing } from '@/theme';

const QUICK = [
  { key: 'browse', icon: 'storefront', route: '/(tabs)/market' },
  { key: 'prices', icon: 'trending-up', route: '/(tabs)/prices' },
  { key: 'saved', icon: 'bookmark', route: '/notifications' },
  { key: 'aiPredict', icon: 'sparkles', route: '/(tabs)/predict' },
] as const;

export default function Dashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const offline = useOffline();

  const [trending, setTrending] = useState<TrendingPrice[]>([]);
  const [listings, setListings] = useState<CropListing[]>([]);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tr, cr] = await Promise.all([PricesApi.trending(), CropsApi.list({ available: 'true' })]);
      setTrending(tr);
      setListings(cr.results ?? []);
      setUsingCache(false);
      await cacheSet('dashboard', { trending: tr, listings: cr.results ?? [] });
    } catch {
      const cached = await cacheGet<{ trending: TrendingPrice[]; listings: CropListing[] }>('dashboard');
      if (cached) {
        setTrending(cached.value.trending);
        setListings(cached.value.listings);
        setCachedAt(cached.ts);
        setUsingCache(true);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const greetingName = user?.full_name?.split(' ')[0] ?? (isGuest ? 'Guest' : '');

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      {(offline || usingCache) && <OfflineBanner timestamp={cachedAt} />}

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>{t('dashboard.greeting')},</Text>
          <Text style={styles.name}>{greetingName || t('app.name')}</Text>
        </View>
        <Pressable onPress={() => router.push('/notifications')} style={styles.bell}>
          <Ionicons name="notifications" size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* Weather widget (default location; replaceable with device GPS) */}
      <Card style={styles.weather}>
        <Ionicons name="partly-sunny" size={40} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.weatherTemp}>22°C · Huye</Text>
          <Text style={styles.weatherSub}>Good drying conditions today</Text>
        </View>
      </Card>

      <Text style={styles.section}>{t('dashboard.quickActions')}</Text>
      <View style={styles.grid}>
        {QUICK.map((q) => (
          <Pressable key={q.key} style={styles.tile} onPress={() => router.push(q.route as any)}>
            <Ionicons name={q.icon as any} size={26} color={colors.primary} />
            <Text style={styles.tileText}>{t(`dashboard.${q.key}`)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>{t('dashboard.trending')}</Text>
      {trending.slice(0, 6).map((tp, i) => (
        <Card key={`${tp.coffee_type}-${tp.price_type}-${i}`} style={styles.trendRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.trendName}>{tp.coffee_type_display}</Text>
            <Text style={styles.trendSub}>{tp.price_type} · {tp.currency}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.trendPrice}>{Number(tp.latest_price).toLocaleString()} {tp.currency}</Text>
            <Text style={[styles.change, { color: tp.change_pct >= 0 ? colors.up : colors.down }]}>
              {tp.change_pct >= 0 ? '▲' : '▼'} {Math.abs(tp.change_pct).toFixed(1)}%
            </Text>
          </View>
        </Card>
      ))}

      <Text style={styles.section}>{t('dashboard.nearYou')}</Text>
      {listings.slice(0, 5).map((l) => (
        <Pressable key={l.id} onPress={() => router.push(`/product/${l.id}`)}>
          <Card style={styles.trendRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.trendName}>{l.coffee_type_display} · {l.grade_display}</Text>
              <Text style={styles.trendSub}>{l.cooperative_name} · {l.location}</Text>
            </View>
            <Text style={styles.trendPrice}>{Number(l.price_per_kg).toLocaleString()} {l.currency}/kg</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { color: colors.textMuted, fontSize: font.md },
  name: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  bell: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  weather: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  weatherTemp: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  weatherSub: { color: colors.textMuted, fontSize: font.sm },
  section: { color: colors.text, fontSize: font.lg, fontWeight: '700', marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 92,
    justifyContent: 'center',
  },
  tileText: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  trendRow: { flexDirection: 'row', alignItems: 'center' },
  trendName: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  trendSub: { color: colors.textMuted, fontSize: font.xs, textTransform: 'capitalize' },
  trendPrice: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  change: { fontSize: font.xs, fontWeight: '700' },
});
