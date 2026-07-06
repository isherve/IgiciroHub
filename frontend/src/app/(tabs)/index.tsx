import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AnalyticsApi, CropsApi, PricesApi } from '@/api/services';
import { AnalyticsOverview, CropListing, TrendingPrice } from '@/api/types';
import { Card } from '@/components/Card';
import { GuestBanner } from '@/components/GuestBanner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Screen } from '@/components/Screen';
import { useOffline } from '@/components/useOffline';
import { useAuth } from '@/context/AuthContext';
import { isAdmin, isCooperative } from '@/lib/permissions';
import { cacheGet, cacheSet } from '@/lib/storage';
import { colors, font, radius, spacing } from '@/theme';

const QUICK_ALL = [
  { key: 'browse', icon: 'search', route: '/(tabs)/market', tone: 'green' },
  { key: 'prices', icon: 'stats-chart', route: '/(tabs)/prices', tone: 'orange' },
  { key: 'saved', icon: 'heart', route: '/notifications', tone: 'green' },
  { key: 'aiPredict', icon: 'sparkles', route: '/(tabs)/predict', tone: 'orange' },
] as const;

const QUICK_COOP = [
  { key: 'coopHub', icon: 'business', route: '/cooperative', tone: 'green' },
  { key: 'browse', icon: 'search', route: '/(tabs)/market', tone: 'green' },
  { key: 'prices', icon: 'stats-chart', route: '/(tabs)/prices', tone: 'orange' },
  { key: 'aiPredict', icon: 'sparkles', route: '/(tabs)/predict', tone: 'orange' },
] as const;

const QUICK_GUEST = [
  { key: 'browse', icon: 'search', route: '/(tabs)/market', tone: 'green' },
  { key: 'prices', icon: 'stats-chart', route: '/(tabs)/prices', tone: 'orange' },
] as const;

function timeGreeting(t: (k: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return t('dashboard.greetingMorning');
  if (h < 17) return t('dashboard.greetingAfternoon');
  return t('dashboard.greetingEvening');
}

function activityIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === 'prediction') return 'sparkles';
  if (type === 'listing') return 'leaf';
  return 'chatbubble-ellipses';
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'now';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; tone: 'green' | 'orange' }) {
  const bg = tone === 'orange' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(31, 174, 75, 0.15)';
  const fg = tone === 'orange' ? colors.accent : colors.primary;
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={fg} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const offline = useOffline();

  const [trending, setTrending] = useState<TrendingPrice[]>([]);
  const [listings, setListings] = useState<CropListing[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tr, cr] = await Promise.all([PricesApi.trending(), CropsApi.list({ available: 'true' })]);
      setTrending(tr);
      setListings(cr.results ?? []);
      let ov: AnalyticsOverview | null = null;
      if (user && isAdmin(user)) {
        ov = await AnalyticsApi.overview();
      }
      setAnalytics(ov);
      setUsingCache(false);
      await cacheSet('dashboard', { trending: tr, listings: cr.results ?? [], analytics: ov });
    } catch {
      const cached = await cacheGet<{
        trending: TrendingPrice[];
        listings: CropListing[];
        analytics: AnalyticsOverview;
      }>('dashboard');
      if (cached) {
        setTrending(cached.value.trending);
        setListings(cached.value.listings);
        setAnalytics(cached.value.analytics ?? null);
        setCachedAt(cached.ts);
        setUsingCache(true);
      }
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const displayName = useMemo(() => {
    if (user?.full_name) return user.full_name.split(',')[0].trim();
    if (isGuest) return t('dashboard.explorer');
    return t('app.name');
  }, [user, isGuest, t]);

  const trendTotal = useMemo(() => {
    if (!analytics) return 1;
    const { up, down, stable } = analytics.market.trends;
    return up + down + stable || 1;
  }, [analytics]);

  const quickActions = useMemo(() => {
    if (isGuest) return QUICK_GUEST;
    if (user && isCooperative(user)) return QUICK_COOP;
    return QUICK_ALL;
  }, [isGuest, user]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      {(offline || usingCache) && <OfflineBanner timestamp={cachedAt} />}
      {isGuest && <GuestBanner />}

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{timeGreeting(t)} 👋</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>
        {!isGuest && user && (
          <Pressable onPress={() => router.push('/notifications')} style={styles.bell}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            <View style={styles.bellDot} />
          </Pressable>
        )}
      </View>

      {analytics && (
        <>
          <Text style={styles.section}>{t('dashboard.systemOverview')}</Text>
          <View style={styles.statGrid}>
            <StatCard label={t('dashboard.statCoops')} value={String(analytics.counts.cooperatives)} icon="people" tone="green" />
            <StatCard label={t('dashboard.statListings')} value={String(analytics.counts.listings)} icon="storefront" tone="orange" />
            <StatCard label={t('dashboard.statPredictions')} value={String(analytics.counts.predictions)} icon="analytics" tone="green" />
            <StatCard label={t('dashboard.statMessages')} value={String(analytics.counts.messages)} icon="chatbubbles" tone="orange" />
            <StatCard label={t('dashboard.statPrices')} value={String(analytics.counts.price_records)} icon="trending-up" tone="green" />
            <StatCard label={t('dashboard.statAlerts')} value={String(analytics.counts.active_alerts)} icon="notifications" tone="orange" />
          </View>

          <Card style={styles.snapshot}>
            <Text style={styles.snapshotTitle}>{t('dashboard.marketSnapshot')}</Text>
            <View style={styles.snapshotRow}>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>{t('dashboard.avgFarmgate')}</Text>
                <Text style={styles.snapshotValue}>
                  {Math.round(analytics.market.avg_farmgate_rwf).toLocaleString()} RWF
                </Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>{t('dashboard.avgExport')}</Text>
                <Text style={styles.snapshotValue}>
                  ${analytics.market.avg_export_usd.toFixed(2)}/lb
                </Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>{t('dashboard.totalVolume')}</Text>
                <Text style={styles.snapshotValue}>
                  {Math.round(analytics.marketplace.total_kg_available).toLocaleString()} {t('dashboard.kgUnit')}
                </Text>
              </View>
            </View>

            <Text style={styles.subSection}>{t('dashboard.priceTrends')}</Text>
            <View style={styles.trendBar}>
              <View style={[styles.trendSeg, { flex: analytics.market.trends.up, backgroundColor: colors.up }]} />
              <View style={[styles.trendSeg, { flex: analytics.market.trends.stable, backgroundColor: colors.textMuted }]} />
              <View style={[styles.trendSeg, { flex: analytics.market.trends.down, backgroundColor: colors.down }]} />
            </View>
            <View style={styles.trendLegend}>
              <Text style={[styles.legendText, { color: colors.up }]}>
                ▲ {t('dashboard.rising')} {Math.round((analytics.market.trends.up / trendTotal) * 100)}%
              </Text>
              <Text style={[styles.legendText, { color: colors.textMuted }]}>
                ● {t('dashboard.stable')} {Math.round((analytics.market.trends.stable / trendTotal) * 100)}%
              </Text>
              <Text style={[styles.legendText, { color: colors.down }]}>
                ▼ {t('dashboard.falling')} {Math.round((analytics.market.trends.down / trendTotal) * 100)}%
              </Text>
            </View>
          </Card>

          {analytics.by_region.length > 0 && (
            <>
              <Text style={styles.section}>{t('dashboard.byRegion')}</Text>
              {analytics.by_region.slice(0, 4).map((r) => (
                <Card key={r.region} style={styles.regionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.regionName}>{r.region}</Text>
                    <Text style={styles.regionSub}>
                      {r.cooperatives} coops · {r.listings} listings
                    </Text>
                  </View>
                  <View style={styles.regionBarWrap}>
                    <View
                      style={[
                        styles.regionBar,
                        { width: `${Math.min(100, (r.listings / Math.max(analytics.counts.listings, 1)) * 100 * 2)}%` },
                      ]}
                    />
                  </View>
                </Card>
              ))}
            </>
          )}

          <Card style={styles.mlCard}>
            <Text style={styles.snapshotTitle}>{t('dashboard.mlInsights')}</Text>
            <View style={styles.snapshotRow}>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>{t('dashboard.avgAccuracy')}</Text>
                <Text style={styles.snapshotValue}>{analytics.prediction_summary.avg_accuracy}%</Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>{t('dashboard.rising')}</Text>
                <Text style={[styles.snapshotValue, { color: colors.up }]}>{analytics.prediction_summary.rising}</Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>{t('dashboard.falling')}</Text>
                <Text style={[styles.snapshotValue, { color: colors.down }]}>{analytics.prediction_summary.falling}</Text>
              </View>
            </View>
          </Card>

          {analytics.recent_activity.length > 0 && (
            <>
              <Text style={styles.section}>{t('dashboard.recentActivity')}</Text>
              {analytics.recent_activity.slice(0, 5).map((a, i) => (
                <Card key={`${a.type}-${a.timestamp}-${i}`} style={styles.activityRow}>
                  <View style={styles.activityIcon}>
                    <Ionicons name={activityIcon(a.type)} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityTitle}>{a.title}</Text>
                    <Text style={styles.activityDetail} numberOfLines={1}>{a.detail}</Text>
                  </View>
                  <Text style={styles.activityTime}>{formatRelative(a.timestamp)}</Text>
                </Card>
              ))}
            </>
          )}
        </>
      )}

      <Card style={styles.weather}>
        <View style={styles.weatherIcon}>
          <Ionicons name="sunny" size={28} color={colors.accentSoft} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.weatherLoc}>{t('dashboard.weatherLocation')}</Text>
          <Text style={styles.weatherTemp}>{t('dashboard.weatherTemp')}</Text>
          <Text style={styles.weatherSub}>{t('dashboard.weatherTip')} 🌱</Text>
        </View>
      </Card>

      <Text style={styles.section}>{t('dashboard.quickActions')}</Text>
      <View style={styles.quickRow}>
        {quickActions.map((q) => {
          const bg = q.tone === 'orange' ? colors.accent : colors.primary;
          return (
            <Pressable key={q.key} style={styles.quickItem} onPress={() => router.push(q.route as any)}>
              <View style={[styles.quickCircle, { backgroundColor: bg }]}>
                <Ionicons name={q.icon as any} size={22} color={colors.white} />
              </View>
              <Text style={styles.quickLabel}>{t(`dashboard.${q.key}`)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.marketHero} onPress={() => router.push('/(tabs)/market')}>
        <View style={{ flex: 1 }}>
          <Text style={styles.marketTag}>{t('dashboard.marketplace')}</Text>
          <Text style={styles.marketTitle}>{t('dashboard.marketplaceTitle')}</Text>
          <Text style={styles.marketCta}>{t('dashboard.marketplaceCta')} ›</Text>
        </View>
        <Text style={styles.marketEmoji}>🌽 🥔 ☕</Text>
      </Pressable>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>{t('dashboard.trending')}</Text>
        <Pressable onPress={() => router.push('/(tabs)/prices')}>
          <Text style={styles.seeAll}>{t('dashboard.seeAll')}</Text>
        </Pressable>
      </View>

      {trending.length === 0 ? (
        <Card>
          <Text style={styles.empty}>{t('dashboard.noTrending')}</Text>
        </Card>
      ) : (
        trending.slice(0, 4).map((tp, i) => (
          <Pressable key={`${tp.coffee_type}-${tp.price_type}-${i}`} onPress={() => router.push('/(tabs)/prices')}>
            <Card style={styles.trendRow}>
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
          </Pressable>
        ))
      )}

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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greeting: { color: colors.textMuted, fontSize: font.md },
  name: { color: colors.text, fontSize: font.xxl, fontWeight: '800', marginTop: 2 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  statCard: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: { color: colors.text, fontSize: font.lg, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: font.xs, marginTop: 2 },
  snapshot: { marginTop: spacing.sm },
  snapshotTitle: { color: colors.text, fontSize: font.md, fontWeight: '700', marginBottom: spacing.sm },
  snapshotRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  snapshotItem: { flex: 1 },
  snapshotLabel: { color: colors.textMuted, fontSize: font.xs },
  snapshotValue: { color: colors.text, fontSize: font.sm, fontWeight: '700', marginTop: 2 },
  subSection: { color: colors.textMuted, fontSize: font.xs, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.xs },
  trendBar: { flexDirection: 'row', height: 8, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.border },
  trendSeg: { minWidth: 4 },
  trendLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, flexWrap: 'wrap', gap: 4 },
  legendText: { fontSize: font.xs, fontWeight: '600' },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  regionName: { color: colors.text, fontSize: font.sm, fontWeight: '700' },
  regionSub: { color: colors.textMuted, fontSize: font.xs, marginTop: 2 },
  regionBarWrap: { width: 72, height: 6, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  regionBar: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
  mlCard: { marginTop: spacing.sm },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(31, 174, 75, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: { color: colors.text, fontSize: font.sm, fontWeight: '700' },
  activityDetail: { color: colors.textMuted, fontSize: font.xs, marginTop: 2 },
  activityTime: { color: colors.textMuted, fontSize: font.xs },
  weather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
    marginTop: spacing.sm,
  },
  weatherIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherLoc: { color: 'rgba(255,255,255,0.8)', fontSize: font.sm },
  weatherTemp: { color: colors.white, fontSize: font.xl, fontWeight: '800' },
  weatherSub: { color: 'rgba(255,255,255,0.85)', fontSize: font.sm, marginTop: 2 },
  section: { color: colors.text, fontSize: font.lg, fontWeight: '700', marginTop: spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  seeAll: { color: colors.primary, fontSize: font.sm, fontWeight: '700' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  quickItem: { alignItems: 'center', flex: 1, gap: spacing.sm },
  quickCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { color: colors.text, fontSize: font.xs, fontWeight: '600', textAlign: 'center' },
  marketHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  marketTag: { color: 'rgba(255,255,255,0.85)', fontSize: font.xs, fontWeight: '700', letterSpacing: 1 },
  marketTitle: { color: colors.white, fontSize: font.xl, fontWeight: '800', marginTop: 4 },
  marketCta: { color: colors.white, fontSize: font.md, fontWeight: '700', marginTop: spacing.sm },
  marketEmoji: { fontSize: 28 },
  trendRow: { flexDirection: 'row', alignItems: 'center' },
  trendName: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  trendSub: { color: colors.textMuted, fontSize: font.xs, textTransform: 'capitalize' },
  trendPrice: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  change: { fontSize: font.xs, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center' },
});
