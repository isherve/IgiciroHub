import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { apiError } from '@/api/api';
import { ChatApi, COFFEE_GRADES, COFFEE_TYPES, CoopApi, CropsApi } from '@/api/services';
import { Cooperative, CropListing } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { RequireCooperative } from '@/components/RequireCooperative';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { colors, font, radius, spacing } from '@/theme';

export default function CooperativeHub() {
  return (
    <RequireCooperative>
      <CooperativeScreen />
    </RequireCooperative>
  );
}

function CooperativeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [coop, setCoop] = useState<Cooperative | null>(null);
  const [listings, setListings] = useState<CropListing[]>([]);
  const [unread, setUnread] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');
  const [description, setDescription] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [coffeeType, setCoffeeType] = useState(COFFEE_TYPES[0].value);
  const [grade, setGrade] = useState('A');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [listingDesc, setListingDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const profile = await CoopApi.me();
      setCoop(profile);
      setName(profile.cooperative_name);
      setLocation(profile.location);
      setContact(profile.contact_info ?? '');
      setDescription(profile.description ?? '');
      const crops = await CropsApi.list({ cooperative: profile.id });
      setListings(crops.results ?? []);
      const uc = await ChatApi.unreadCount();
      setUnread(uc.unread);
      setError('');
    } catch (e) {
      setError(apiError(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await CoopApi.updateMe({
        cooperative_name: name.trim(),
        location: location.trim(),
        contact_info: contact.trim(),
        description: description.trim(),
      });
      setCoop(updated);
      setEditing(false);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const createListing = async () => {
    const qty = Number(quantity);
    const p = Number(price);
    if (!qty || qty <= 0 || !p || p <= 0) {
      setError(t('cooperative.invalidListing'));
      return;
    }
    setCreating(true);
    setError('');
    try {
      await CropsApi.create({
        coffee_type: coffeeType,
        quality_grade: grade,
        quantity_kg: qty,
        price_per_kg: p,
        currency: 'RWF',
        location: location.trim() || coop?.location,
        description: listingDesc.trim(),
        is_available: true,
      });
      setQuantity('');
      setPrice('');
      setListingDesc('');
      setShowForm(false);
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setCreating(false);
    }
  };

  const toggleAvailable = async (item: CropListing, value: boolean) => {
    try {
      await CropsApi.update(item.id, { is_available: value });
      setListings((prev) => prev.map((l) => (l.id === item.id ? { ...l, is_available: value } : l)));
    } catch (e) {
      setError(apiError(e));
    }
  };

  const removeListing = (item: CropListing) => {
    Alert.alert(t('cooperative.deleteListing'), item.coffee_type_display, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete', { defaultValue: 'Delete' }),
        style: 'destructive',
        onPress: async () => {
          try {
            await CropsApi.remove(item.id);
            setListings((prev) => prev.filter((l) => l.id !== item.id));
          } catch (e) {
            setError(apiError(e));
          }
        },
      },
    ]);
  };

  const activeCount = listings.filter((l) => l.is_available).length;
  const totalKg = listings.reduce((sum, l) => sum + Number(l.quantity_kg), 0);

  return (
    <Screen>
      <Text style={styles.title}>{t('cooperative.title')}</Text>
      <Text style={styles.sub}>{t('cooperative.subtitle')}</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.statGrid}>
        <Stat label={t('cooperative.statListings')} value={String(activeCount)} icon="leaf" />
        <Stat label={t('cooperative.statVolume')} value={`${Math.round(totalKg).toLocaleString()} kg`} icon="cube" />
        <Stat label={t('cooperative.statMessages')} value={String(unread)} icon="chatbubbles" />
      </View>

      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.section}>{t('cooperative.profile')}</Text>
          {!editing ? (
            <Pressable onPress={() => setEditing(true)}>
              <Text style={styles.link}>{t('profile.edit')}</Text>
            </Pressable>
          ) : null}
        </View>

        {!coop ? (
          <Text style={styles.muted}>{t('common.loading')}</Text>
        ) : editing ? (
          <>
            <Field label={t('auth.coopName')} value={name} onChangeText={setName} />
            <Field label={t('auth.location')} value={location} onChangeText={setLocation} />
            <Field label={t('cooperative.contact')} value={contact} onChangeText={setContact} />
            <Field label={t('cooperative.about')} value={description} onChangeText={setDescription} multiline />
            <View style={styles.row}>
              <Button title={t('common.cancel')} variant="outline" onPress={() => setEditing(false)} style={{ flex: 1 }} />
              <Button title={t('profile.save')} onPress={saveProfile} loading={saving} style={{ flex: 1 }} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.coopName}>{coop.cooperative_name}</Text>
            <Text style={styles.muted}>{coop.location}</Text>
            {coop.contact_info ? <Text style={styles.rowText}>{coop.contact_info}</Text> : null}
            {coop.description ? <Text style={styles.desc}>{coop.description}</Text> : null}
          </>
        )}
      </Card>

      <View style={styles.cardHeader}>
        <Text style={styles.section}>{t('cooperative.myListings')}</Text>
        <Pressable onPress={() => setShowForm((v) => !v)}>
          <Text style={styles.link}>{showForm ? t('common.cancel') : t('cooperative.addListing')}</Text>
        </Pressable>
      </View>

      {showForm && (
        <Card>
          <Segmented label={t('predict.step2')} options={COFFEE_TYPES} value={coffeeType} onChange={setCoffeeType} />
          <Segmented label={t('cooperative.grade')} options={COFFEE_GRADES} value={grade} onChange={setGrade} />
          <Field label={t('cooperative.quantity')} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          <Field label={t('cooperative.pricePerKg')} value={price} onChangeText={setPrice} keyboardType="numeric" />
          <Field label={t('cooperative.listingDesc')} value={listingDesc} onChangeText={setListingDesc} multiline />
          <Button title={t('cooperative.publish')} onPress={createListing} loading={creating} />
        </Card>
      )}

      {listings.length === 0 ? (
        <Text style={styles.muted}>{t('cooperative.noListings')}</Text>
      ) : (
        listings.map((item) => (
          <Card key={item.id}>
            <View style={styles.listingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listingTitle}>
                  {item.coffee_type_display} · {item.grade_display}
                </Text>
                <Text style={styles.muted}>
                  {Number(item.quantity_kg).toLocaleString()} kg · {Number(item.price_per_kg).toLocaleString()} {item.currency}/kg
                </Text>
              </View>
              <Pressable onPress={() => router.push(`/product/${item.id}`)}>
                <Ionicons name="open-outline" size={20} color={colors.primary} />
              </Pressable>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.rowText}>{t('cooperative.available')}</Text>
              <Switch
                value={item.is_available}
                onValueChange={(v) => toggleAvailable(item, v)}
                trackColor={{ true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
            <Button title={t('cooperative.deleteListing')} variant="outline" onPress={() => removeListing(item)} />
          </Card>
        ))
      )}

      <Button title={t('chat.title')} variant="accent" onPress={() => router.push('/chat')} />
    </Screen>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  sub: { color: colors.textMuted, fontSize: font.sm, marginBottom: spacing.sm },
  errorText: { color: colors.danger, fontSize: font.sm, marginBottom: spacing.sm },
  section: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  link: { color: colors.primary, fontSize: font.sm, fontWeight: '700' },
  coopName: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: font.sm, marginTop: 2 },
  desc: { color: colors.text, fontSize: font.sm, marginTop: spacing.sm },
  rowText: { color: colors.text, fontSize: font.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  statGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.text, fontSize: font.md, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: font.xs, textAlign: 'center' },
  listingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  listingTitle: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.sm },
});
